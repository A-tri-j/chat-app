const BASE_URL = 'http://localhost:8000'

export default function FileMessage({ message, onViewOnceOpen, isMe }) {
  const isImage = message.message_type === 'image'
  const isAudio = message.message_type === 'audio'
  const isVideo = message.message_type === 'video'
  const isViewOnce = message.view_once

  const fullUrl = message.file_url?.startsWith('http')
    ? message.file_url
    : message.file_url
    ? `${BASE_URL}${message.file_url}`
    : null

  // ── View Once Image ──
  if (isViewOnce && isImage) {

    // sender — never clickable, just show status
    if (isMe) {
      return (
        <div style={styles.viewOnceOpenedBox}>
          <span style={styles.viewOnceOpenedIcon}>👁</span>
          <div>
            <p style={styles.viewOnceOpenedTitle}>Photo</p>
            <p style={styles.viewOnceOpenedSub}>
              {message.view_once_opened ? 'Opened' : 'Sent'}
            </p>
          </div>
        </div>
      )
    }

    // receiver already opened — show placeholder
    if (message.view_once_opened || !fullUrl) {
      return (
        <div style={styles.viewOnceOpenedBox}>
          <span style={styles.viewOnceOpenedIcon}>👁</span>
          <div>
            <p style={styles.viewOnceOpenedTitle}>Photo</p>
            <p style={styles.viewOnceOpenedSub}>Opened</p>
          </div>
        </div>
      )
    }

    // not opened yet — show tap to view
    return (
      <div style={styles.viewOnceBox} onClick={onViewOnceOpen}>
        <div style={styles.viewOnceLeft}>
          <span style={styles.viewOnceIcon}>👁</span>
        </div>
        <div style={styles.viewOnceRight}>
          <p style={styles.viewOnceTitle}>View once photo</p>
          <p style={styles.viewOnceSub}>Tap to open • Opens once only</p>
        </div>
        <span style={styles.viewOnceArrow}>▶</span>
      </div>
    )
  }

  // ── Normal Image ──
  if (isImage && fullUrl) {
    return (
      <div>
        <img
          src={fullUrl}
          alt="sent image"
          style={styles.image}
          onClick={() => window.open(fullUrl, '_blank')}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
        {message.message && (
          <p style={styles.caption}>{message.message}</p>
        )}
      </div>
    )
  }

  // ── Audio ──
  if (isAudio && fullUrl) {
    return (
      <div style={styles.audioWrapper}>
        <audio controls src={fullUrl} style={styles.audio} />
      </div>
    )
  }

  // ── Video ──
  if (isVideo && fullUrl) {
    return (
      <video controls src={fullUrl} style={styles.video} />
    )
  }

  // ── File Download ──
  if (fullUrl) {
    return (
      <a
        href={fullUrl}
        target="_blank"
        rel="noreferrer"
        style={styles.fileLink}
        download={message.file_name}
      >
        <span style={styles.fileIcon}>📎</span>
        <span style={styles.fileName}>
          {message.file_name || 'Download file'}
        </span>
      </a>
    )
  }

  // ── No URL (deleted/expired) ──
  return (
    <div style={styles.expiredBox}>
      <span>🚫</span>
      <p style={styles.expiredText}>File no longer available</p>
    </div>
  )
}

const styles = {
  // normal image
  image: {
    maxWidth: '100%',
    maxHeight: 280,
    borderRadius: 8,
    display: 'block',
    cursor: 'pointer',
    objectFit: 'cover'
  },
  caption: {
    margin: '6px 0 0',
    fontSize: 14,
    color: '#1a1a1a'
  },

  // view once — not opened
  viewOnceBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    cursor: 'pointer',
    border: '1px solid #ffe082',
    minWidth: 220
  },
  viewOnceLeft: {
    flexShrink: 0
  },
  viewOnceIcon: {
    fontSize: 28
  },
  viewOnceRight: {
    flex: 1
  },
  viewOnceTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: '700',
    color: '#e65100'
  },
  viewOnceSub: {
    margin: '3px 0 0',
    fontSize: 11,
    color: '#888'
  },
  viewOnceArrow: {
    fontSize: 12,
    color: '#e65100',
    flexShrink: 0
  },

  // view once — already opened
  viewOnceOpenedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    minWidth: 160
  },
  viewOnceOpenedIcon: {
    fontSize: 22,
    opacity: 0.4
  },
  viewOnceOpenedTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: '600',
    color: '#999'
  },
  viewOnceOpenedSub: {
    margin: '2px 0 0',
    fontSize: 11,
    color: '#bbb'
  },

  // audio
  audioWrapper: { padding: '4px 0' },
  audio: { width: '100%', maxWidth: 260 },

  // video
  video: {
    maxWidth: '100%',
    maxHeight: 240,
    borderRadius: 8,
    display: 'block'
  },

  // file
  fileLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    textDecoration: 'none',
    color: '#1a1a1a'
  },
  fileIcon: { fontSize: 20 },
  fileName: {
    fontSize: 13,
    color: '#075e54',
    fontWeight: '500',
    wordBreak: 'break-all'
  },

  // expired
  expiredBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: 8
  },
  expiredText: {
    margin: 0,
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic'
  }
}