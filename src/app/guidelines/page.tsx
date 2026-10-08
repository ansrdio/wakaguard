import Link from 'next/link';
import { BookOpen, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';

export default function GuidelinesPage() {
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
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Community Guidelines</h1>
          </div>

          <p className="text-gray-600 mb-8">
            Last Updated: December 31, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is a community-driven platform for reporting and sharing road conditions, hazards, 
              and traffic issues. Our goal is to help drivers stay informed and safe on the road.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              To maintain a helpful and respectful community, we ask all users to follow these guidelines.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              What to Report
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is designed for reporting road-related issues. Appropriate reports include:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Potholes:</strong> Damaged or dangerous road surfaces</li>
              <li><strong>Traffic:</strong> Congestion, slow-moving traffic, or gridlock</li>
              <li><strong>Accidents:</strong> Collisions affecting traffic flow</li>
              <li><strong>Roadwork:</strong> Construction zones and lane closures</li>
              <li><strong>Hazards:</strong> Debris, animals, flooding, or other dangers</li>
              <li><strong>Closures:</strong> Road closures or blocked routes</li>
              <li><strong>Other:</strong> Road-related issues not covered above</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Prohibited Content
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The following types of content are strictly prohibited:
            </p>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                🚫 No Personal Accusations or Doxxing
              </h3>
              <p className="text-red-800 mb-2">
                <strong>Never include identifying information about individuals.</strong> This includes:
              </p>
              <ul className="list-disc list-inside text-red-800 space-y-1">
                <li>Names, addresses, or phone numbers</li>
                <li>License plate numbers</li>
                <li>Photos of people's faces</li>
                <li>Accusations against specific individuals or businesses</li>
                <li>Personally identifiable information (PII)</li>
              </ul>
              <p className="text-red-800 mt-2">
                <strong>Violations will result in content removal and possible account restrictions.</strong>
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Spam and Misleading Content</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Duplicate reports of the same issue</li>
              <li>False or misleading information</li>
              <li>Advertising or promotional content</li>
              <li>Links to external websites or services</li>
              <li>Off-topic content unrelated to road conditions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Harassment and Hate Speech</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Abusive, threatening, or harassing language</li>
              <li>Hate speech targeting race, religion, gender, etc.</li>
              <li>Bullying or intimidation</li>
              <li>Sexual content or harassment</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Illegal Activity</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Content promoting illegal activities</li>
              <li>Instructions for dangerous or harmful acts</li>
              <li>Impersonation of others</li>
              <li>Copyright or trademark violations</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Inappropriate Images</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Graphic violence or gore</li>
              <li>Nudity or sexual content</li>
              <li>Photos containing identifiable people without consent</li>
              <li>Photos with visible license plates</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Best Practices</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Creating Quality Reports</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Be specific:</strong> Describe the issue clearly and concisely</li>
              <li><strong>Be accurate:</strong> Ensure location and details are correct</li>
              <li><strong>Be timely:</strong> Report issues as you encounter them</li>
              <li><strong>Choose the right severity:</strong> Critical for immediate dangers, Low for minor issues</li>
              <li><strong>Add photos:</strong> Visual evidence helps others understand the situation</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Commenting and Voting</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Upvote:</strong> Confirm issues you've also encountered</li>
              <li><strong>Downvote:</strong> Mark resolved or inaccurate reports</li>
              <li><strong>Comment:</strong> Add helpful updates or additional information</li>
              <li><strong>Be respectful:</strong> Treat others with courtesy</li>
              <li><strong>Stay on topic:</strong> Keep discussions relevant to the report</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reporting Violations</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you see content that violates these guidelines, please flag it for review:
            </p>
            <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-2">
              <li>Click the "Flag" button on the report or comment</li>
              <li>Select the reason for flagging</li>
              <li>Submit your flag for moderator review</li>
            </ol>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our moderation team reviews flagged content and takes appropriate action, which may include:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Removing the content</li>
              <li>Marking reports as resolved or disputed</li>
              <li>Restricting user accounts for repeated violations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Controls</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have control over your experience on WakaGuard:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Block Users:</strong> Hide reports and comments from specific users</li>
              <li><strong>Flag Content:</strong> Report violations for moderator review</li>
              <li><strong>Vote:</strong> Help the community identify accurate and helpful reports</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Consequences of Violations</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Violations of these guidelines may result in:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Content removal:</strong> Reports or comments may be deleted</li>
              <li><strong>Account warnings:</strong> First-time violations may receive a warning</li>
              <li><strong>Account restrictions:</strong> Repeated violations may result in restrictions</li>
              <li><strong>Permanent ban:</strong> Severe or repeated violations may result in permanent account termination</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy and Safety</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Important safety reminders:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Never use the app while driving</li>
              <li>Don't include personal information in reports</li>
              <li>Be cautious when navigating to reported locations</li>
              <li>Report emergencies to local authorities, not just on WakaGuard</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to Guidelines</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may update these Community Guidelines from time to time. Continued use of WakaGuard 
              constitutes acceptance of the current guidelines.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Questions?</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is a product of Inskriba Limited, a company registered in Nigeria.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about these guidelines, please contact us at:
            </p>
            <p className="text-blue-600 font-medium">
              <a href="mailto:support@wakaguard.app" className="hover:underline">
                support@wakaguard.app
              </a>
            </p>
          </section>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-8">
            <p className="text-blue-900 font-medium">
              Thank you for helping keep WakaGuard safe and useful for everyone! 🚗💙
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
