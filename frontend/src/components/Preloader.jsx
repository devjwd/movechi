import './Preloader.css'

export default function Preloader() {
  return (
    <div className="preloader-container">
      <div className="preloader-content">
        <div className="preloader-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h2 className="preloader-text">MOVECHI</h2>
        <p className="preloader-subtext">Loading...</p>
        <div className="preloader-bar">
          <div className="preloader-progress"></div>
        </div>
      </div>
    </div>
  )
}
