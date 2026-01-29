import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>

          <p className="text-gray-600 mb-8">
            Last Updated: December 31, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is committed to protecting your privacy. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our mobile application and website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Location Data</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect precise location data (GPS coordinates) when you create a report. This data is used to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Display report locations on the map</li>
              <li>Help other users find and navigate to reported issues</li>
              <li>Provide location-based filtering and search</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              You control when location data is shared by choosing whether to create a report. Location data 
              is only collected when you actively use the "Create Report" feature.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Photos</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you upload photos to a report:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Photos are compressed and resized before upload (max 1600px width, ≤600KB)</li>
              <li>Photos are stored securely in Firebase Storage</li>
              <li>Photo URLs are publicly accessible to display on reports</li>
              <li>EXIF data (including GPS coordinates) is not removed automatically</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              <strong>Important:</strong> Do not include photos with identifiable people, license plates, 
              or other personal information without consent.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Anonymous User ID</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              We use Firebase Anonymous Authentication to assign you a unique identifier (UID). This UID:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Is generated automatically when you first use the app</li>
              <li>Is not linked to any personal information</li>
              <li>Allows us to track your reports, votes, and comments</li>
              <li>Enables features like blocking users and preventing duplicate votes</li>
              <li>Persists across sessions but is lost if you clear app data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">User-Generated Content</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect and store content you create, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Report descriptions and types</li>
              <li>Comments on reports</li>
              <li>Votes (upvotes/downvotes)</li>
              <li>Flags for inappropriate content</li>
              <li>Blocked user lists (stored privately)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Provide and maintain the WakaGuard service</li>
              <li>Display reports on the map and in lists</li>
              <li>Enable community voting and commenting</li>
              <li>Moderate content and enforce community guidelines</li>
              <li>Prevent abuse and spam</li>
              <li>Improve the app based on usage patterns</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Reports</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Reports are automatically expired based on their type:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Traffic:</strong> 2 hours</li>
              <li><strong>Accident:</strong> 4 hours</li>
              <li><strong>Hazard:</strong> 24 hours</li>
              <li><strong>Other:</strong> 3 days</li>
              <li><strong>Pothole:</strong> 7 days</li>
              <li><strong>Closure:</strong> 14 days</li>
              <li><strong>Roadwork:</strong> 30 days</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Expired reports are marked as "expired" and may be hidden from public view, but data is retained 
              for moderation and audit purposes.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Photos</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Photos are stored in Firebase Storage and remain accessible as long as the report exists. 
              We may retain photos indefinitely for moderation purposes.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Comments and Votes</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Comments and votes are retained as long as the associated report exists. Removed comments 
              are soft-deleted (marked as removed) but not permanently deleted.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">User Accounts</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Anonymous authentication data is stored indefinitely unless you delete the app and clear data. 
              Your blocked user list is stored in your user document and deleted if you uninstall the app.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share data in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Public Display:</strong> Reports, comments, and photos are publicly visible to all users</li>
              <li><strong>Service Providers:</strong> We use Firebase (Google) for backend services</li>
              <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect rights and safety</li>
              <li><strong>Moderation:</strong> Flagged content is reviewed by administrators</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights and Choices</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Choose whether to share location data by not creating reports</li>
              <li>Block users to hide their content from your view</li>
              <li>Flag inappropriate content for review</li>
              <li>Delete the app to remove your anonymous authentication</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              <strong>Note:</strong> We do not currently offer account deletion or data export features. 
              Once content is posted, it cannot be deleted by users (only by administrators).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Firebase Security Rules control database access</li>
              <li>Photos are stored with secure access controls</li>
              <li>HTTPS encryption for all data transmission</li>
              <li>Anonymous authentication prevents account takeovers</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              However, no method of transmission over the Internet is 100% secure. Use caution when 
              posting sensitive information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is not intended for children under 13. We do not knowingly collect information 
              from children. If you believe a child has provided us with information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of changes by 
              updating the "Last Updated" date at the top of this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-blue-600 font-medium">
              <a href="mailto:support@wakaguard.app" className="hover:underline">
                support@wakaguard.app
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
