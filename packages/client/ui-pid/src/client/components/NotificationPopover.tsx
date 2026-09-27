import React from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { pidStore } from '../pidStore'
import css from './NotificationPopover.module.css'

export const NotificationPopover: React.FC = () => {
  const { notifications } = useWorkbenchStore()

  const handleNotificationClick = (id: string, route?: string, entityId?: string) => {
    workbenchStore.markNotificationRead(id)
    workbenchStore.toggleNotification()
    if (route) {
      if (route === '/pid') {
        pidStore.setActiveNav('pid')
      } else {
        workbenchStore.setActiveRoute(route)
      }
    }
  }

  return (
    <div className={css.popover}>
      <div className={css.header}>
        <h3 className={css.title}>Notifications</h3>
        <span className={css.count}>{notifications.filter(n => !n.read).length} unread</span>
      </div>

      <div className={css.list}>
        {notifications.map(n => (
          <div
            key={n.id}
            className={`${css.item} ${!n.read ? css.unread : ''}`}
            onClick={() => handleNotificationClick(n.id, n.route, n.entityId)}
          >
            <div className={css.dotArea}>
              {!n.read && <span className={css.unreadDot} />}
            </div>
            <div className={css.body}>
              <h4 className={css.itemTitle}>{n.title}</h4>
              <p className={css.itemDesc}>{n.description}</p>
              <span className={css.time}>{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
