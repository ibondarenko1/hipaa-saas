import React, { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { notificationsApi } from '../services/api'
import type { Notification } from '../types'
import { formatDistanceToNow } from 'date-fns'

interface NotificationBellProps {
  tenantId: string
}

export function NotificationBell({ tenantId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    try {
      const res = await notificationsApi.list(tenantId, { unread: true })
      setNotifications((res.data || []) as Notification[])
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    if (!tenantId) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tenantId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.length

  const markAsRead = async (notifId: string) => {
    try {
      await notificationsApi.markRead(tenantId, notifId)
      setNotifications((prev) => prev.filter((n) => n.id !== notifId))
    } catch {
      // Silent fail
    }
  }

  const markAllRead = async () => {
    await Promise.allSettled(notifications.map((n) => markAsRead(n.id)))
    setNotifications([])
    setShowDropdown(false)
  }

  return (
    <div className="relative" ref={notifRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-slate-900 shadow-xl rounded-xl border border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <span className="font-semibold text-sm text-slate-200">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">You&apos;re all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => markAsRead(notif.id)}
                  onKeyDown={(e) => e.key === 'Enter' && markAsRead(notif.id)}
                  className="px-4 py-3 border-b border-slate-700 last:border-0 hover:bg-slate-800/50 cursor-pointer flex items-start gap-3"
                >
                  <div className="w-2 h-2 mt-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 leading-tight">
                      {notif.subject || notif.type}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowDropdown(false)}
                className="text-xs text-slate-500 hover:text-slate-400 w-full text-center"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
