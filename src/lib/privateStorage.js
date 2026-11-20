const PREFIX = 'aureva_private_v1_'

let currentUserId = null

export function setStorageUser(userId) {
  currentUserId = userId || null
}

export function getStorageUser() {
  return currentUserId
}

function privateKey(key) {
  if (!currentUserId) {
    throw new Error('Debes iniciar sesión para acceder a tus datos')
  }

  return `${PREFIX}${currentUserId}_${key}`
}

export const privateStorage = {
  getItem(key) {
    return localStorage.getItem(privateKey(key))
  },

  setItem(key, value) {
    localStorage.setItem(privateKey(key), value)
  },

  removeItem(key) {
    localStorage.removeItem(privateKey(key))
  }
}
