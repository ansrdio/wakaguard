import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { COMPANY_ADDRESS, COMPANY_NAME, CONTACT_EMAIL } from '@/lib/company';
import { MESSAGE_LOG_DAYS_AFTER_DELETION } from '@/lib/dataRetention';
import { ALERT_GRACE_MINUTES, MAX_TRUSTED_CONTACTS } from '@/lib/tripPlanning';

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
            Last Updated: October 9, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is a travel-safety app. You start a trip, our server watches it, and if you have not
              checked in by your arrival time the contacts you chose are texted your last known location. The
              app also has an SOS button and a map of road reports from other users. WakaGuard is a product
              of {COMPANY_NAME}.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              This Privacy Policy explains what we collect when you use the app and website, who can see it,
              and how long we keep it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Account Details</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You can look at the map of road reports without an account. To start a trip, add contacts or
              post a report you need one, and we collect:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Your email address, which you must verify, and a password. Sign-in is handled by Firebase Authentication, a Google service; we do not store your password ourselves</li>
              <li>A username you choose</li>
              <li>The name you enter for alerts (&quot;Your name, as they know you&quot;), which appears in texts to your contacts and on your trip page</li>
              <li>A random ID for each phone or browser you use, so that only one device sends a trip&apos;s location</li>
              <li>Points and activity counts linked to your reports and sign-ins</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Your chosen state, your display settings and any unsent report drafts are kept on your device,
              not on our servers.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Location During a Trip</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you start a trip, your phone sends its precise location (GPS coordinates and how accurate
              they are) to WakaGuard:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Once when the trip starts, then as often as every 30 seconds, and normally at least every 2 minutes, until the trip ends</li>
              <li>In the phone app, this continues with the screen locked or while you use other apps</li>
              <li>In a web browser, only while the WakaGuard page is open and on screen</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              We store the latest position and the time we received it, and during the trip we build a path of
              where your phone has been (up to 240 points) for the trip map. We also store the destination you
              typed, your expected arrival time, the points where the trip started and ended, and any time you
              added.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              Your phone stops sending its location when the trip ends.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Location at Other Times</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Outside a trip, WakaGuard does not follow your location. We receive it only when you do one of
              these:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Press SOS:</strong> your position is saved with the alert and sent to your trusted contacts</li>
              <li><strong>Send an &quot;I&apos;m okay&quot; text:</strong> a recent position, if your phone has one, is included in the text</li>
              <li><strong>Log a checkpoint stop:</strong> your position is saved to your account. It is not sent to anyone</li>
              <li><strong>Create a road report:</strong> the location you set for the report is shown publicly on the map</li>
              <li><strong>Tap &quot;Use my location&quot; when choosing your state, or set a report&apos;s location:</strong> the coordinates are sent to OpenStreetMap&apos;s look-up service to turn them into a state or an address</li>
              <li><strong>Switch on push notifications in Profile:</strong> your position at that moment is saved, so that we can notify you about new road reports within about 10 km of it</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Showing your own position on the map happens on your device and is not sent to us.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Trusted Contacts &amp; Phone Numbers</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              For each trusted contact you add (up to {MAX_TRUSTED_CONTACTS}) we store:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>The name and mobile number you enter for them</li>
              <li>Which contacts you chose for each trip</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you choose &quot;From phone&quot;, the app reads your phone&apos;s contact list on your device so
              that you can pick someone. Only the contact you pick is saved.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              <strong>Important:</strong> You must have consent from individuals before adding them as trusted contacts.
              Their phone numbers are used only to send the safety texts described below.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Road Reports and Community Content</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect and store content you create, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Report types, descriptions and locations</li>
              <li>Comments on reports</li>
              <li>Votes (upvotes/downvotes, and whether a report is still there or resolved)</li>
              <li>Flags for inappropriate content</li>
              <li>Blocked user lists (stored privately)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Photos</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you upload photos to a report:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Photos are compressed and resized before upload (max 1600px width, ≤600KB)</li>
              <li>Photos are stored in Firebase Storage</li>
              <li>Photo URLs are publicly accessible to display on reports</li>
              <li>Details your camera embeds in a photo (EXIF data, which can include GPS coordinates) are not reliably removed</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              <strong>Important:</strong> Do not include photos with identifiable people, license plates,
              or other personal information without consent.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Notifications</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              If you allow notifications in the phone app, we store a token that identifies your device to
              Google&apos;s and Apple&apos;s notification services. We use it to send the &quot;Are you okay?&quot;
              reminder when a trip passes its arrival time and, if you switch on push notifications in Profile,
              notices about new road reports nearby.
            </p>
          </section>

          <section className="mb-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📱 Trip Sharing and Text Messages (SMS)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              A trip is shared in two ways: through a trip link, and through text messages to your trusted
              contacts. By using these features, you agree to the following:
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">The Trip Link</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Every trip has its own link. <strong>Anyone who has the link can open it in a web browser
              without signing in</strong>, so share it only with people you trust. The link is not listed or
              searchable anywhere, and the code in it is long and random. The page it opens shows:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>The name you entered for alerts and the destination you typed</li>
              <li>Your phone&apos;s last reported position, when we received it, and the path it has reported during this trip</li>
              <li>Your expected arrival time, and whether you are overdue or have sent an SOS</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              The link stops working when you end the trip. If a trip is never ended, the link expires by
              itself: a day after the trip started (or 12 hours after its arrival time, if that is later), or
              three days after an overdue alert or an SOS, so that your contacts can still use it.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">When Texts Are Sent</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Trip link:</strong> when you start a trip, if you tick &quot;Text them the trip link when I start&quot;</li>
              <li><strong>Overdue alert:</strong> sent by our server {ALERT_GRACE_MINUTES} minutes after your arrival time if the trip is still running, without any further action from you</li>
              <li><strong>SOS alert:</strong> when you press SOS</li>
              <li><strong>&quot;I&apos;m okay&quot;:</strong> when you tap it</li>
              <li><strong>Follow-ups:</strong> when you add time or end a trip after your contacts were alerted</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              Texts go only to trusted contacts you have added. We do not send marketing messages.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">What a Text Contains</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>The name you entered for alerts</li>
              <li>Depending on the message: your destination, your expected arrival time, your last known location as a Google Maps link with the time we received it, and the trip link</li>
              <li>Each message is addressed to the contact by the name you saved for them, says it is from WakaGuard, and ends &quot;Powered by Inskriba Ltd.&quot; Texts about a test trip begin &quot;WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY.&quot;</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Consent &amp; Opt-In</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              By adding trusted contacts or sending SMS messages through WakaGuard:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>You confirm you have obtained consent from recipients to receive safety-related SMS messages from you via WakaGuard</li>
              <li>You understand that opening the links in a text uses the recipient&apos;s mobile data</li>
              <li>You agree not to use SMS features for spam, marketing, or non-safety purposes</li>
              <li>You acknowledge that a text being sent does not mean it has arrived: networks can delay or drop messages, so SMS should not be relied upon as the sole means of emergency communication</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Limits</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Only accounts with a verified email address can send texts</li>
              <li>We limit how many texts one account can send in an hour and in a day to prevent abuse</li>
              <li>No message goes to more than {MAX_TRUSTED_CONTACTS} contacts</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Opting Out</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Recipients of SMS messages can:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Ask you to remove them from your trusted contacts list</li>
              <li>Block the sending number on their device</li>
              <li>Contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a> to request removal</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">SMS Service Provider</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We send texts through Termii, a third-party SMS service provider. By using our SMS features:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Recipient phone numbers and message content are passed to Termii, which hands them to the mobile networks</li>
              <li>Termii may retain message logs for troubleshooting and its own records</li>
              <li>Termii&apos;s privacy policy applies: <a href="https://termii.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://termii.com/privacy-policy</a></li>
              <li>Text messages are not encrypted</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Message Logs</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We maintain logs of SMS messages sent through our service, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Your account ID</li>
              <li>Recipient names and phone numbers</li>
              <li>Message type (trip link, &quot;I&apos;m okay&quot;, overdue alert, SOS, follow-up)</li>
              <li>The text of the message, which can include a location link</li>
              <li>Whether the provider accepted it (sent, partly sent, failed or blocked)</li>
              <li>Timestamp</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              We use these logs for troubleshooting and abuse prevention. &quot;Sent&quot; in a log, and in the
              app, means the provider accepted the text; we cannot see whether it reached the recipient&apos;s
              phone.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Provide and maintain the WakaGuard service</li>
              <li>Watch a trip&apos;s arrival time and alert your trusted contacts if you do not check in</li>
              <li>Show your trip to the people who have its link</li>
              <li>Send the safety texts and reminders described above</li>
              <li>Display reports on the map and in lists</li>
              <li>Enable community voting and commenting</li>
              <li>Moderate content and enforce community guidelines</li>
              <li>Prevent abuse and spam (including SMS rate limiting)</li>
              <li>Improve the app based on usage patterns, for example by comparing planned and actual journey times</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Trips</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>The path shown on the trip map is deleted when the trip ends. After an SOS it is kept until you end the trip</li>
              <li>The trip link stops working when the trip ends or expires, as described above</li>
              <li>A record of each trip stays in your account after it ends: the destination, the start and end points, the last position we received, the planned and actual times, any time you added, and which contacts you chose</li>
              <li>SOS alerts and checkpoint stops you log, with their locations, also stay in your account</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              These records are private to your account. We keep them until you delete your account or ask
              us to delete them.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Trusted Contacts and Message Logs</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              A trusted contact is deleted when you remove it. Logs of texts already sent, which include the
              recipient&apos;s name and number, are kept for troubleshooting and abuse prevention until we no
              longer need them or you ask us to delete them. If you delete your account, they are kept for{' '}
              {MESSAGE_LOG_DAYS_AFTER_DELETION} days and then deleted automatically.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Reports</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Reports are automatically expired based on their type:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Traffic:</strong> 2 hours</li>
              <li><strong>Accident:</strong> 4 hours</li>
              <li><strong>Checkpoint:</strong> 4 hours</li>
              <li><strong>Hazard:</strong> 24 hours</li>
              <li><strong>Other:</strong> 3 days</li>
              <li><strong>Pothole:</strong> 7 days</li>
              <li><strong>Closure:</strong> 14 days</li>
              <li><strong>Roadwork:</strong> 30 days</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              Expired reports are marked as &quot;expired&quot; and may be hidden from public view, but data is retained
              for moderation and audit purposes. Deleting your account deletes your reports.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Photos</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Photos are stored in Firebase Storage and remain accessible as long as the report exists.
              We may keep them after that for moderation purposes. Deleting your account deletes your photos.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Comments and Votes</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Comments and votes are retained as long as the associated report exists. Removed comments
              are soft-deleted (marked as removed) but not permanently deleted. Deleting your account
              deletes the comments and votes you posted.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">User Accounts</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Your account and the data held with it are kept until you delete your account. You can do
              that yourself at any time: in the app, open Profile and tap Delete account; on the website,
              open the account menu and choose Delete account. Everything listed above is then deleted
              straight away, except the log of texts sent to your contacts, which is kept for{' '}
              {MESSAGE_LOG_DAYS_AFTER_DELETION} days. The steps, and what is deleted and kept, are set out
              on the <Link href="/delete-account" className="text-blue-600 hover:underline">Delete your account</Link> page.
              Signing out, or deleting the app from your phone, does not delete your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share data in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li><strong>Your Trusted Contacts:</strong> The texts described above share your name, location, destination and trip status with the phone numbers you chose</li>
              <li><strong>Anyone With Your Trip Link:</strong> While a trip is open, its page can be opened by anyone who has the link</li>
              <li><strong>Public Display:</strong> Reports, comments, and photos are publicly visible to all users</li>
              <li><strong>Service Providers:</strong> We use Firebase (Google) for sign-in, data storage, hosting and notifications, and Termii and the mobile networks for SMS. These providers may process data on servers outside Nigeria</li>
              <li><strong>Maps:</strong> Map images are loaded by your device from OpenStreetMap, which sees your IP address and the area you are viewing. Location links in texts and on the trip page open in Google Maps</li>
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
              <li>Choose whether to share location data: it is sent continuously only while a trip you started is running, and you can refuse location permission on your phone</li>
              <li>Choose, for each trip, which contacts are told and whether they are texted the trip link at the start</li>
              <li>End a trip at any time, which stops your phone sending its location and switches off the trip link</li>
              <li>Add or remove trusted contacts at any time</li>
              <li>Turn notifications off in Profile or in your phone&apos;s settings</li>
              <li>Block users to hide their content from your view</li>
              <li>Flag inappropriate content for review</li>
              <li>Delete your account and the data held with it yourself, as described under User Accounts above</li>
              <li>Ask us for a copy of the data we hold about you, or ask us to correct or delete it, by writing to <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a></li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              <strong>Note:</strong> The app does not yet have a button for exporting your data, so that
              request is handled by email. A single report or comment cannot be deleted by its author once
              posted (only by administrators); deleting your account deletes everything you posted.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Firebase Security Rules control database access: your trips, trusted contacts and alerts cannot be read by other users</li>
              <li>A trip page can be opened only with its link, and only while the trip is open</li>
              <li>Only signed-in accounts can upload photos</li>
              <li>HTTPS encryption for data sent between the app and our servers</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-6">
              However, no method of transmission over the Internet is 100% secure, and text messages are not
              encrypted. Use caution when posting sensitive information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children&apos;s Privacy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is not intended for children under 13. We do not knowingly collect information
              from children. If you believe a child has provided us with information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of changes by
              updating the &quot;Last Updated&quot; date at the top of this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              WakaGuard is a product of {COMPANY_NAME}, a company registered in Nigeria.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Contact address: {COMPANY_ADDRESS}
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-blue-600 font-medium">
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
