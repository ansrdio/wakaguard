import Link from 'next/link';
import { Headphones, ArrowLeft, Mail, MessageCircle, HelpCircle, Bug, FileText } from 'lucide-react';
import { COMPANY_ADDRESS, COMPANY_NAME, CONTACT_EMAIL } from '@/lib/company';

export default function SupportPage() {
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
            <Headphones className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Support</h1>
          </div>

          <p className="text-gray-600 mb-8">
            Need help? We're here to assist you.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
                  <p className="text-gray-700 mb-3">
                    For general inquiries, bug reports, or feedback, please email us at:
                  </p>
                  <a 
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-blue-600 font-medium text-lg hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <p className="text-gray-600 text-sm mt-2">
                    We typically respond within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I create a report?
                </h3>
                <p className="text-gray-700">
                  Tap the blue "+" button in the bottom right corner of the home screen. Choose the 
                  report type, severity, add a description, and select the location on the map or use 
                  your GPS location. You can also add up to 5 photos.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Why can I only vote once per report?
                </h3>
                <p className="text-gray-700">
                  To prevent spam and ensure accurate vote counts, each user can only vote once (either 
                  upvote or downvote) per report. This helps maintain the integrity of the community feedback.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I block a user?
                </h3>
                <p className="text-gray-700">
                  On a report detail page, scroll to the "Report Actions" section and tap "Block User." 
                  Once blocked, you will no longer see reports or comments from that user. This action 
                  cannot be undone through the app.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I report inappropriate content?
                </h3>
                <p className="text-gray-700">
                  Tap the "Flag" button on any report or comment. Select the reason for flagging and 
                  submit. Our moderation team will review the content and take appropriate action.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  How long do reports stay active?
                </h3>
                <p className="text-gray-700">
                  Reports expire based on their type: Traffic (2 hours), Accidents (4 hours), Hazards 
                  (24 hours), Potholes (7 days), Closures (14 days), and Roadwork (30 days). Expired 
                  reports are automatically marked as expired.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I delete my reports or comments?
                </h3>
                <p className="text-gray-700">
                  Currently, users cannot delete their own content. If you need content removed, please 
                  contact support with the report ID or details. Administrators can remove content that 
                  violates our guidelines.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Is my location data shared?
                </h3>
                <p className="text-gray-700">
                  Your location is only used when you create a report. The GPS coordinates of the report 
                  location are publicly visible on the map. Your current location is not tracked unless 
                  you actively create a report. See our{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  for more details.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Why is my photo upload failing?
                </h3>
                <p className="text-gray-700">
                  Photos are automatically compressed to 600KB. If upload fails, check your internet 
                  connection. Ensure the file is an image (JPEG, PNG, or WebP) and under 10MB before 
                  compression. You can upload up to 5 photos per report.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Report a Bug</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Bug className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Found a Bug?</h3>
                  <p className="text-gray-700 mb-3">
                    Help us improve WakaGuard by reporting bugs. Please include:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">
                    <li>Device type and operating system version</li>
                    <li>Steps to reproduce the issue</li>
                    <li>Expected vs. actual behavior</li>
                    <li>Screenshots if applicable</li>
                  </ul>
                  <p className="text-gray-700">
                    Send bug reports to:{' '}
                    <a 
                      href={`mailto:${CONTACT_EMAIL}?subject=Bug Report`}
                      className="text-blue-600 hover:underline"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Feature Requests</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <MessageCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Have an Idea?</h3>
                  <p className="text-gray-700 mb-3">
                    We love hearing from our community! If you have ideas for new features or 
                    improvements, please share them with us.
                  </p>
                  <p className="text-gray-700">
                    Send feature requests to:{' '}
                    <a 
                      href={`mailto:${CONTACT_EMAIL}?subject=Feature Request`}
                      className="text-blue-600 hover:underline"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Additional Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                href="/privacy"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Privacy Policy</h3>
                  <p className="text-sm text-gray-600">Learn how we handle your data</p>
                </div>
              </Link>

              <Link 
                href="/guidelines"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HelpCircle className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Community Guidelines</h3>
                  <p className="text-sm text-gray-600">Read our content rules</p>
                </div>
              </Link>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Emergency Situations</h2>
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-900 font-medium mb-2">
                ⚠️ Important Safety Notice
              </p>
              <p className="text-red-800">
                WakaGuard is NOT for emergency situations. If you encounter an emergency (accident 
                with injuries, immediate road hazards, etc.), please contact local emergency services 
                immediately (112 in Nigeria). Do not rely solely on WakaGuard for emergency reporting.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Business Inquiries</h2>
            <p className="text-gray-700 mb-4">
              WakaGuard is a product of {COMPANY_NAME}, a company registered in Nigeria.
            </p>
            <p className="text-gray-700 mb-4">
              Contact address: {COMPANY_ADDRESS}
            </p>
            <p className="text-gray-700 mb-4">
              For partnership opportunities, media inquiries, or business-related questions, please contact:
            </p>
            <p className="text-blue-600 font-medium text-lg">
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <p className="text-blue-900 text-center">
              <strong>We're here to help!</strong> Don't hesitate to reach out if you have any questions or concerns.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
