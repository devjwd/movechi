import { Link } from 'react-router-dom'
import './Terms.css'

function Terms() {
  return (
    <div className="terms-page">
      <div className="terms-container">
        <Link to="/" className="terms-back-btn">← Back to Home</Link>
        
        <div className="terms-content">
          <h1 className="terms-title">Terms and Conditions</h1>
          
          <section className="terms-section">
            <h2>1. Introduction</h2>
            <p>
              Welcome to MoveChI ("Application"). These Terms and Conditions govern your use of the Application and all associated services. By accessing and using the Application, you agree to be bound by these Terms and Conditions. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="terms-section">
            <h2>2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on MoveChI for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on MoveChI</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>3. Wallet Connection and User Accounts</h2>
            <p>
              By connecting your cryptocurrency wallet to MoveChI, you acknowledge that:
            </p>
            <ul>
              <li>You are solely responsible for maintaining the security of your wallet</li>
              <li>MoveChI is not responsible for any loss or damage resulting from unauthorized access to your wallet</li>
              <li>You agree to use the Application only for lawful purposes and in a way that does not infringe upon the rights of others</li>
              <li>All transactions are final and cannot be reversed</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>4. Game and Rewards</h2>
            <p>
              MoveChI offers a gaming experience with potential rewards. Please note:
            </p>
            <ul>
              <li>Rewards are offered as-is and may be subject to change</li>
              <li>Participation in MoveChI constitutes acceptance of all rewards structures and terms</li>
              <li>MoveChI reserves the right to modify game rules and reward structures at any time</li>
              <li>Claiming rewards constitutes acceptance of these Terms and Conditions</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>5. Limitation of Liability</h2>
            <p>
              In no event shall MoveChI, its operators, agents, or anyone else involved in creating, producing, or delivering the Application be liable for any damages of any kind, including without limitation direct, incidental, consequential, indirect, or punitive damages, arising out of your use of or inability to use the materials.
            </p>
          </section>

          <section className="terms-section">
            <h2>6. Accuracy of Materials</h2>
            <p>
              The materials appearing on MoveChI could include technical, typographical, or photographic errors. MoveChI does not warrant that any of the materials in the Application are accurate, complete, or current. MoveChI may make changes to the materials contained in the Application at any time without notice.
            </p>
          </section>

          <section className="terms-section">
            <h2>7. Materials and Content</h2>
            <p>
              The materials in MoveChI are provided for general information only. MoveChI does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.
            </p>
          </section>

          <section className="terms-section">
            <h2>8. Limitations</h2>
            <p>
              In no event shall MoveChI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on MoveChI.
            </p>
          </section>

          <section className="terms-section">
            <h2>9. Accuracy of Information</h2>
            <p>
              If material in the Application is inaccurate or if you discover an error, please report it to us immediately. We will make every effort to correct such errors.
            </p>
          </section>

          <section className="terms-section">
            <h2>10. Links</h2>
            <p>
              MoveChI has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by MoveChI of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section className="terms-section">
            <h2>11. Modifications</h2>
            <p>
              MoveChI may revise these Terms and Conditions for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these Terms and Conditions.
            </p>
          </section>

          <section className="terms-section">
            <h2>12. Governing Law</h2>
            <p>
              These Terms and Conditions and any separate agreements we provide as a license for use of specific material in the Application are governed by and construed in accordance with the laws of the jurisdiction in which MoveChI is located.
            </p>
          </section>

          <section className="terms-section">
            <h2>13. Contact Us</h2>
            <p>
              If you have any questions about these Terms and Conditions, please contact us through the Application or visit our website.
            </p>
          </section>

          <div className="terms-footer">
            <p>Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <Link to="/" className="terms-back-btn">← Back to Home</Link>
      </div>
    </div>
  )
}

export default Terms
