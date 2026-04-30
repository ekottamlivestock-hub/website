'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ProtectedRoute from '@/components/ProtectedRoute'
import ImageUploader from '@/components/ImageUploader'
import { pathFromPublicUrl, removeFromBucket } from '@/lib/storage-cleanup'
import toast from 'react-hot-toast'
import {
  Loader2, Plus, Edit2, Trash2, Save, ToggleLeft, ToggleRight,
  Calendar, ArrowLeft, ImageIcon,
} from 'lucide-react'

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AdminNewsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <NewsContent />
    </ProtectedRoute>
  )
}

function NewsContent() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    body: '',
    news_date: todayISO(),
    is_published: true,
  })
  const [photos, setPhotos] = useState([])
  // URLs that were attached to the post when we opened the editor —
  // anything that was here but is gone on save needs its storage file
  // cleaned up, same diff-pattern as listing edits.
  const [originalPhotos, setOriginalPhotos] = useState([])

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('news_posts')
      .select('*, news_post_media(url, sort_order)')
      .order('news_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load news')
    setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  const resetForm = () => {
    setForm({ title: '', body: '', news_date: todayISO(), is_published: true })
    setPhotos([])
    setOriginalPhotos([])
    setEditId(null)
  }

  const startNew = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (post) => {
    const sortedUrls = (post.news_post_media || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(m => m.url)

    setForm({
      title: post.title,
      body: post.body,
      news_date: (post.news_date || todayISO()).slice(0, 10),
      is_published: post.is_published,
    })
    setPhotos(sortedUrls)
    setOriginalPhotos(sortedUrls)
    setEditId(post.id)
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.body.trim())  { toast.error('Body is required');  return }
    if (photos.length === 0) { toast.error('Add at least one photo'); return }

    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        news_date: form.news_date || todayISO(),
        is_published: form.is_published,
      }

      let postId = editId
      if (editId) {
        const { error } = await supabase.from('news_posts').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
          .from('news_posts')
          .insert({ ...payload, created_by: user?.id || null })
          .select('id')
          .single()
        if (error) throw error
        postId = data.id
      }

      // Replace media rows with the current photo set so the on-disk
      // ordering matches the order the admin arranged them in.
      await supabase.from('news_post_media').delete().eq('news_post_id', postId)
      if (photos.length > 0) {
        const rows = photos.map((url, i) => ({
          news_post_id: postId,
          url,
          sort_order: i,
        }))
        const { error: mediaErr } = await supabase.from('news_post_media').insert(rows)
        if (mediaErr) throw mediaErr
      }

      // Clean up storage files that were dropped during this edit.
      const kept = new Set(photos)
      const droppedPaths = originalPhotos
        .filter(url => !kept.has(url))
        .map(url => pathFromPublicUrl(url, 'news-media'))
        .filter(Boolean)
      if (droppedPaths.length > 0) {
        await removeFromBucket('news-media', droppedPaths)
      }

      toast.success(editId ? 'News updated' : 'News published')
      cancelForm()
      fetchPosts()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save news')
    } finally {
      setSubmitting(false)
    }
  }

  const togglePublished = async (post) => {
    const { error } = await supabase
      .from('news_posts')
      .update({ is_published: !post.is_published })
      .eq('id', post.id)
    if (error) { toast.error('Failed to update'); return }
    fetchPosts()
  }

  const deletePost = async (post) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    try {
      // Pull all media URLs first; the FK cascade kills the rows but
      // leaves the storage files behind, same gotcha as listings.
      const { data: media } = await supabase
        .from('news_post_media')
        .select('url')
        .eq('news_post_id', post.id)

      const { error } = await supabase.from('news_posts').delete().eq('id', post.id)
      if (error) throw error

      const paths = (media || [])
        .map(m => pathFromPublicUrl(m.url, 'news-media'))
        .filter(Boolean)
      if (paths.length > 0) await removeFromBucket('news-media', paths)

      toast.success('News deleted')
      fetchPosts()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="page-container flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="page-container max-w-4xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">News</h1>
          <p className="text-sm text-stone-500">Add, edit, or remove news shown on the home page.</p>
        </div>
        {!showForm && (
          <button onClick={startNew} className="btn-primary text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add news
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-stone-100 p-6 mb-8 shadow-sm space-y-5"
        >
          <h2 className="font-semibold text-stone-800">
            {editId ? 'Edit news' : 'New news entry'}
          </h2>

          <div>
            <label className="input-label">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input-field"
              placeholder="e.g. New buffalo breed approved by ICAR"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="input-label">Full text *</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              className="input-field min-h-[160px]"
              placeholder="Write the full news here. The first 1–2 lines will appear as the preview on the home page."
              maxLength={5000}
              required
            />
            <p className="text-[11px] text-stone-400 mt-1">
              {form.body.length}/5000 characters
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date *
              </label>
              <input
                type="date"
                value={form.news_date}
                onChange={e => setForm(f => ({ ...f, news_date: e.target.value }))}
                className="input-field"
                required
              />
              <p className="text-[11px] text-stone-400 mt-1">Shown on the card and detail page.</p>
            </div>

            <div>
              <label className="input-label">Status</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                className={`input-field flex items-center justify-between ${
                  form.is_published ? 'text-emerald-700' : 'text-stone-500'
                }`}
              >
                <span className="text-sm font-medium">
                  {form.is_published ? 'Published (visible to public)' : 'Draft (hidden)'}
                </span>
                {form.is_published
                  ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                  : <ToggleLeft  className="w-5 h-5 text-stone-300" />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Photos (first photo becomes the cover)</label>
            <ImageUploader
              bucket="news-media"
              folder=""
              maxFiles={8}
              maxSizeMB={5}
              images={photos}
              onImagesChange={setPhotos}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={cancelForm}
              className="btn-ghost border border-stone-200 text-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm flex items-center gap-1"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? 'Update' : 'Publish'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center">
            <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600 font-medium">No news yet</p>
            <p className="text-xs text-stone-400 mt-1">
              Click &ldquo;Add news&rdquo; to create your first entry.
            </p>
          </div>
        ) : (
          posts.map(post => {
            const cover = (post.news_post_media || [])
              .slice()
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.url
            const photoCount = (post.news_post_media || []).length
            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow flex gap-4 p-3"
              >
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  {cover ? (
                    <Image src={cover} alt="" fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-800 truncate">{post.title}</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {new Date(post.news_date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {' · '}{photoCount} photo{photoCount !== 1 && 's'}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                      post.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {post.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 mt-2 line-clamp-2">{post.body}</p>

                  <div className="flex items-center gap-1 mt-3">
                    <button
                      onClick={() => togglePublished(post)}
                      className={`p-1.5 rounded ${post.is_published ? 'text-emerald-500' : 'text-stone-300'}`}
                      title={post.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {post.is_published ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => startEdit(post)}
                      className="p-1.5 text-stone-400 hover:text-blue-600 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePost(post)}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
