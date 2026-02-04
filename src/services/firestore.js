import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

// Create a Firestore service factory for a collection
export function createFirestoreService(collectionName) {
  function getCollectionRef(userId) {
    return collection(db, 'users', userId, collectionName)
  }

  function getDocRef(userId, docId) {
    return doc(db, 'users', userId, collectionName, docId)
  }

  async function add(userId, data) {
    const colRef = getCollectionRef(userId)
    const docData = {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }
    const docRef = await addDoc(colRef, docData)
    return { id: docRef.id, ...data }
  }

  async function get(userId, docId) {
    const docRef = getDocRef(userId, docId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  }

  async function getAll(userId) {
    const colRef = getCollectionRef(userId)
    const q = query(colRef, orderBy('created_at', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  async function getWhere(userId, field, operator, value) {
    const colRef = getCollectionRef(userId)
    const q = query(colRef, where(field, operator, value))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  async function update(userId, docId, data) {
    const docRef = getDocRef(userId, docId)
    const updateData = {
      ...data,
      updated_at: serverTimestamp()
    }
    await updateDoc(docRef, updateData)
  }

  async function remove(userId, docId) {
    const docRef = getDocRef(userId, docId)
    await deleteDoc(docRef)
  }

  async function bulkAdd(userId, items) {
    const batch = writeBatch(db)
    const colRef = getCollectionRef(userId)
    const results = []

    for (const item of items) {
      const docRef = doc(colRef)
      const docData = {
        ...item,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
      batch.set(docRef, docData)
      results.push({ id: docRef.id, ...item })
    }

    await batch.commit()
    return results
  }

  async function bulkDelete(userId, docIds) {
    const batch = writeBatch(db)
    for (const docId of docIds) {
      const docRef = getDocRef(userId, docId)
      batch.delete(docRef)
    }
    await batch.commit()
  }

  function subscribe(userId, callback, queryConstraints = []) {
    const colRef = getCollectionRef(userId)
    const q = query(colRef, ...queryConstraints)

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      callback(data)
    }, (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error)
    })
  }

  return {
    add,
    get,
    getAll,
    getWhere,
    update,
    remove,
    bulkAdd,
    bulkDelete,
    subscribe,
    getCollectionRef,
    getDocRef
  }
}

// Pre-configured services for each collection
export const projectsService = createFirestoreService('projects')
export const contentService = createFirestoreService('content')
export const tasksService = createFirestoreService('tasks')
export const scheduleService = createFirestoreService('schedule')
export const settingsService = createFirestoreService('settings')
export const notesService = createFirestoreService('notes')
