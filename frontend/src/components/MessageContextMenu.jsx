import { useEffect, useRef } from 'react'

export default function MessageContextMenu({
  x,
  y,
  isMe,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose
}) {
  const menuRef = useRef(null)

  // close when clicking outside — use setTimeout to avoid
  // the same right-click event immediately closing the menu
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    // delay adding the listener so the opening click doesn't close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('touchstart', handleClick)
    }, 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [onClose])

  // adjust position so menu doesn't go off screen
  const menuX = Math.min(x, window.innerWidth - 220)
  const menuY = Math.min(y, window.innerHeight - (isMe ? 160 : 120))

  return (
    <div
      ref={menuRef}
      style={{
        ...styles.menu,
        left: menuX,
        top: menuY
      }}
    >
      {/* Delete for me — always available */}
      <button
        style={styles.menuItem}
        onClick={() => {
          onDeleteForMe()
          onClose()
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span style={styles.menuIcon}>🗑️</span>
        <span style={{ pointerEvents: 'none' }}>Delete for me</span>
      </button>

      {/* Delete for everyone — only sender */}
      {isMe && (
        <>
          <div style={styles.divider} />
          <button
            style={{ ...styles.menuItem, ...styles.dangerItem }}
            onClick={() => {
              onDeleteForEveryone()
              onClose()
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ ...styles.menuIcon, pointerEvents: 'none' }}>❌</span>
            <span style={{ pointerEvents: 'none' }}>Delete for everyone</span>
          </button>
        </>
      )}

      <div style={styles.divider} />

      {/* Cancel */}
      <button
        style={{ ...styles.menuItem, color: '#888' }}
        onClick={onClose}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span style={{ ...styles.menuIcon, pointerEvents: 'none' }}>✕</span>
        <span style={{ pointerEvents: 'none' }}>Cancel</span>
      </button>
    </div>
  )
}

const styles = {
  menu: {
    position: 'fixed',
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
    zIndex: 9999,
    minWidth: 200,
    overflow: 'hidden',
    border: '1px solid #f0f0f0'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    color: '#1a1a1a',
    textAlign: 'left',
    transition: 'background 0.15s'
  },
  dangerItem: {
    color: '#e53935'
  },
  menuIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    pointerEvents: 'none'
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    margin: '2px 0'
  }
}
