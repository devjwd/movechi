import React, { useState, useEffect, useCallback } from 'react'
import HomePageHeader from './components/HomePageHeader'
import './home.css'
import './Art.css'

function Art() {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArtwork, setSelectedArtwork] = useState(null)

  const openModal = (artwork) => {
    setSelectedArtwork(artwork)
  }

  const closeModal = () => {
    setSelectedArtwork(null)
  }

  const handleDownload = async (artwork) => {
    try {
      // Fetch the image as a blob to handle CORS issues
      const response = await fetch(artwork.image, { mode: 'cors' })
      const blob = await response.blob()
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${artwork.title.replace(/\s+/g, '_')}.jpg`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: open in new tab if CORS blocks download
      window.open(artwork.image, '_blank')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Load artworks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('movechi_artworks')
      if (stored) {
        setArtworks(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load artworks:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Listen for updates from Admin page
  useEffect(() => {
    const handleArtUpdate = (event) => {
      const newArtworks = event.detail
      setArtworks(newArtworks)
    }

    window.addEventListener('artworkUpdated', handleArtUpdate)
    return () => window.removeEventListener('artworkUpdated', handleArtUpdate)
  }, [])

  if (loading) {
    return (
      <div className="art-container">
        <HomePageHeader activePage="art" />
        <div className="art-content">
          <div className="loading">Loading artworks...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="art-container">
      <HomePageHeader activePage="art" />

      <div className="art-content">
        <div className="art-header">
          <h1>ART GALLERY</h1>
          <p className="art-subtitle">A curated collection of artwork</p>
        </div>

        {artworks.length === 0 ? (
          <div className="empty-state">
            <p>No artworks yet</p>
          </div>
        ) : (
          <div className="art-grid">
            {artworks.map((artwork) => (
              <div key={artwork.id} className="art-piece">
                <div className="art-image" onClick={() => openModal(artwork)}>
                  <img src={artwork.image} alt={artwork.title} />
                  <div className="click-overlay">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c9a961" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="M21 21l-4.35-4.35"/>
                      <path d="M11 8v6M8 11h6"/>
                    </svg>
                  </div>
                </div>
                <div className="art-info">
                  <h3>{artwork.title}</h3>
                  {artwork.artist && <p className="artist">{artwork.artist}</p>}
                  <p className="upload-date">Uploaded: {formatDate(artwork.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-size modal */}
      {selectedArtwork && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8dcc8" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <div className="modal-image-container">
              <img src={selectedArtwork.image} alt={selectedArtwork.title} className="modal-image" />
            </div>
            <div className="modal-info">
              <h2>{selectedArtwork.title}</h2>
              {selectedArtwork.artist && <p className="modal-artist">by {selectedArtwork.artist}</p>}
              {selectedArtwork.description && <p className="modal-description">{selectedArtwork.description}</p>}
              <p className="modal-date">Uploaded: {formatDate(selectedArtwork.createdAt)}</p>
              <button className="btn-download" onClick={() => handleDownload(selectedArtwork)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Art
