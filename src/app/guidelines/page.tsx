import Link from 'next/link';
import { BookOpen, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { COMPANY_ADDRESS, COMPANY_NAME, CONTACT_EMAIL } from '@/lib/company';
import { ALERT_GRACE_MINUTES } from '@/lib/tripPlanning';

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
            Last Updated: October 8, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is a travel-safety app. You start a trip before you set off, and if you have not
              checked in by your arrival time, the contacts you chose are texted your last known location.
              It also has a community map where travellers report road conditions, hazards and traffic.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              To keep WakaGuard dependable for travellers and their contacts, and helpful and respectful as a
              community, we ask all users to follow these guidelines.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Using Safe Trip and SOS</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Safe Trip sends text messages to real people on your behalf. Please use it with care:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Ask first:</strong> Add someone as a trusted contact only if they have agreed, and remove them if they ask</li>
              <li><strong>Use your own name:</strong> Enter the name your contacts know you by, so they know who a text is about</li>
              <li><strong>Share your own trips only:</strong> A trip shares the location of the phone it was started on. Do not start a trip on someone else&apos;s phone to follow them</li>
              <li><strong>Keep the trip link among people you trust:</strong> Anyone who has the link can see where your phone is until the trip ends</li>
              <li><strong>End the trip when you arrive:</strong> If you are running late, add time. Otherwise your contacts are texted {ALERT_GRACE_MINUTES} minutes after your arrival time</li>
              <li><strong>Use SOS only when you are in danger:</strong> To see how alerts work, start a test trip instead. Its texts say they are a test, and it is still worth telling your contacts beforehand</li>
              <li><strong>Safety messages only:</strong> Do not use WakaGuard&apos;s texts for jokes, advertising or anything other than safety</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              What to Report
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Nearby map is for reporting road-related issues. Appropriate reports include:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Checkpoints:</strong> Where a checkpoint is and how long the wait is</li>
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
                <li>Photos of people&apos;s faces</li>
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
              <li><strong>Upvote:</strong> Confirm issues you&apos;ve also encountered</li>
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
              <li>Tap &quot;Flag Report&quot; on the report</li>
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
              <li><strong>Texting switched off:</strong> Accounts that misuse safety texts or SOS may be stopped from sending them</li>
              <li><strong>Permanent ban:</strong> Severe or repeated violations may result in permanent account termination</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy and Safety</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Important safety reminders:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Start your trip before you set off, and never use the app while driving</li>
              <li>Don&apos;t include personal information in reports</li>
              <li>Be cautious when navigating to reported locations</li>
              <li>WakaGuard is not an emergency service and does not replace calling 112. In an emergency, call 112 first</li>
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
              WakaGuard is a product of {COMPANY_NAME}, a company registered in Nigeria.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Contact address: {COMPANY_ADDRESS}
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about these guidelines, please contact us at:
            </p>
            <p className="text-blue-600 font-medium">
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
                {CONTACT_EMAIL}
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
