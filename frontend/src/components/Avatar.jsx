import { getAvatarUrl, getInitial } from '../utils/avatarHelper'

export default function Avatar({
  user,
  size = 40,
  showOnline = false
}) {
  const avatarUrl = getAvatarUrl(user?.avatar_url)
  const fontSize = size * 0.4

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={user?.username}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      ) : (
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#075e54',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize
        }}>
          {getInitial(user?.username)}
        </div>
      )}

      {showOnline && user?.is_online && (
        <div style={{
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: '50%',
          backgroundColor: '#25d366',
          border: '2px solid white',
          position: 'absolute',
          bottom: 0,
          right: 0
        }} />
      )}
    </div>
  )
}