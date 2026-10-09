import Link from 'next/link';
import { Headphones, ArrowLeft, Mail, MessageCircle, HelpCircle, Bug, FileText } from 'lucide-react';
import { COMPANY_ADDRESS, COMPANY_NAME, CONTACT_EMAIL } from '@/lib/company';
import {
  ALERT_GRACE_MINUTES,
  MAX_TRUSTED_CONTACTS,
  TEST_ALERT_GRACE_MINUTES,
  TEST_TRIP_MINUTES,
} from '@/lib/tripPlanning';

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
            Need help? We&apos;re here to assist you.
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

            <h3 className="text-xl font-semibold text-gray-800 mb-4">Safe trips</h3>
            <div className="space-y-6 mb-8">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I start a trip?
                </h4>
                <p className="text-gray-700">
                  Open the Trip tab and sign in. You need an account with a verified email address. Say where
                  you are going, choose how long the journey should take, and pick who should be told: up
                  to {MAX_TRUSTED_CONTACTS} trusted contacts, each with a mobile number that can be texted. Then
                  tap &quot;Start safe trip&quot;. While the trip runs, your phone sends its location to WakaGuard.
                  When you get there, tap &quot;I&apos;ve arrived&quot; and the trip ends.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Who is told about my trip, and when?
                </h4>
                <p className="text-gray-700 mb-3">
                  Only the trusted contacts you pick for that trip. Nobody else is told, and there is no public
                  list of trips.
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">
                  <li>
                    <strong>When you start:</strong> only if &quot;Text them the trip link when I start&quot; is
                    ticked. It starts ticked for long journeys and unticked for short ones, and you can change it
                    either way. You can also send the link yourself with &quot;Share link&quot;.
                  </li>
                  <li>
                    <strong>If you do not arrive:</strong> {ALERT_GRACE_MINUTES} minutes after your arrival time,
                    if the trip is still running, they get a text with your last known location and the trip link.
                  </li>
                  <li>
                    <strong>If you press SOS:</strong> straight away.
                  </li>
                  <li>
                    <strong>Afterwards:</strong> contacts who were sent an overdue or SOS text get a follow-up
                    text when you add time or end the trip.
                  </li>
                </ul>
                <p className="text-gray-700">
                  The trip card tells you what happened to each alert: that a text was sent to your contacts, or
                  that it could not be sent. The{' '}
                  <Link href="/about" className="text-blue-600 hover:underline">
                    About page
                  </Link>{' '}
                  shows what each text looks like.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  What is the {ALERT_GRACE_MINUTES}-minute wait after my arrival time?
                </h4>
                <p className="text-gray-700">
                  Your contacts are not texted the moment your arrival time passes. At that time the trip shows
                  as overdue and, in the phone app with notifications allowed, you get a reminder asking
                  &quot;Are you okay?&quot;. You then have {ALERT_GRACE_MINUTES} minutes to tap &quot;Add
                  time&quot; (15 minutes, 30 minutes or an hour) or &quot;I&apos;ve arrived&quot;. If the trip is
                  still running when the {ALERT_GRACE_MINUTES} minutes are up, your contacts are texted. Our
                  server checks once a minute, so the text can follow up to a minute or so later. It is sent by
                  the server, not by your phone, so it goes out even if your phone is off or out of coverage by
                  then.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I try it out first?
                </h4>
                <p className="text-gray-700">
                  Yes. Under the start button, tap &quot;Try a {TEST_TRIP_MINUTES}-minute test trip
                  instead&quot;. It works like a real trip with shorter waits: the trip
                  lasts {TEST_TRIP_MINUTES} minutes and, if you do not end it, your contacts are texted
                  about {TEST_ALERT_GRACE_MINUTES} minute after that. Every text about a test trip begins
                  &quot;WAKAGUARD TEST ALERT. NOT A REAL EMERGENCY.&quot;, the page your contact opens says it
                  is a test, and SOS does not call 112 during a test trip. These are real texts to real phones,
                  so let your contacts know before you try it.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  What does my contact see when they open the trip link?
                </h4>
                <p className="text-gray-700">
                  A web page. They do not need the app or an account. It shows a map with the path your phone
                  has reported and its latest position, how long ago that position was received, your expected
                  arrival time, and the name and destination you entered. It says plainly when you are overdue
                  or have sent an SOS, and shows &quot;No recent updates&quot; when your phone has been silent
                  for 10 minutes. There is no planned route, and the map shows where your phone last reported,
                  which may not be where you are now. Anyone who has the link can open it, so send it only to
                  people you trust. The link stops working when the trip ends.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  What happens if I have no signal?
                </h4>
                <p className="text-gray-700 mb-3">
                  WakaGuard only hears from your phone over a data connection, so it depends on when the signal
                  goes:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-3 space-y-1">
                  <li>
                    <strong>Before you start:</strong> the trip is saved on your phone and the app says it is
                    not being watched yet. Nobody can be alerted until your phone is back online and the
                    &quot;Waiting for a connection&quot; message has gone.
                  </li>
                  <li>
                    <strong>On the way:</strong> your phone cannot send its location, so the trip page shows the
                    last position received and when. Our server already has your arrival time, so the overdue
                    text still goes out on time, with that last position.
                  </li>
                  <li>
                    <strong>When you arrive:</strong> &quot;I&apos;ve arrived&quot; is saved on your phone, but
                    our server does not know until you are back online, so your contacts could still be texted.
                    If your journey ends somewhere with poor coverage, tell them beforehand.
                  </li>
                </ul>
                <p className="text-gray-700">
                  Your contacts get the alert as an ordinary text, so they need no data to receive it, only to
                  open the links in it.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Does it keep working with my screen locked or the app closed?
                </h4>
                <p className="text-gray-700">
                  The alert does: once a trip has started, the alert is sent by our server and does not depend
                  on your phone. Location is different. The phone app keeps sending your location with the
                  screen locked or while you use other apps, but it stops if the app is force-closed, and
                  battery-saving settings can interrupt it. In a web browser, location is sent only while the
                  WakaGuard page is open and on screen. The trip card shows when your location was last
                  received.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  How does SOS work?
                </h4>
                <p className="text-gray-700">
                  Tap &quot;Emergency SOS&quot; on the Trip tab. &quot;Call 112 Now&quot; opens your phone&apos;s
                  dialler on 112 and, if you are signed in, texts your trusted contacts that you need help, with
                  your location when your phone has one and the trip link when a trip is running. If a call is
                  not safe, &quot;Alert by SMS&quot; texts your contacts without calling. An SOS goes to all your
                  trusted contacts, not only the ones picked for the current trip. If you have no signal, the
                  alert is saved and sent as soon as your phone is back online. If a trip was running, end it
                  when you are safe; your contacts then get a text asking them to call you to confirm. Use SOS
                  only when you are in danger.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  The app says a text was &quot;sent&quot;. Has my contact received it?
                </h4>
                <p className="text-gray-700">
                  Not necessarily. &quot;Sent&quot; means our SMS provider accepted the text for sending.
                  WakaGuard cannot see whether it reached your contact&apos;s phone: networks can delay or drop
                  a text, and a phone can be off or out of coverage. If the app says a text could not be sent,
                  or you need to be sure, call your contact or share the trip link yourself.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Is my location shared?
                </h4>
                <p className="text-gray-700">
                  During a trip, yes, with the people you chose. While a trip runs, your phone sends its
                  location to WakaGuard; anyone with the trip link can see it on the trip page, and it goes into
                  the overdue and SOS texts. When the trip ends, your phone stops sending and the link stops
                  working. Outside a trip, WakaGuard does not follow your location. It is used when you press
                  SOS, send an &quot;I&apos;m okay&quot; text, log a checkpoint stop or create a road report,
                  and the location of a road report is public. See our{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  for more details.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-4">Road reports</h3>
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I create a road report?
                </h4>
                <p className="text-gray-700">
                  Open the Nearby tab and tap &quot;Report&quot;. Choose what you are reporting, add a short
                  description, check the location, and add up to 5 photos if you wish. You need to be signed in.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Why can I only vote once per report?
                </h4>
                <p className="text-gray-700">
                  To prevent spam and ensure accurate vote counts, each user can only vote once (either 
                  upvote or downvote) per report. This helps maintain the integrity of the community feedback.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I report inappropriate content or block a user?
                </h4>
                <p className="text-gray-700">
                  Tap &quot;Flag Report&quot; on a report, select the reason and submit. Our moderation team
                  will review it and take appropriate action. To stop seeing one person&apos;s reports and
                  comments, open the report&apos;s own page (the page a shared report link opens), go to
                  &quot;Report Actions&quot; and tap &quot;Block User&quot;. Blocking cannot be undone through
                  the app.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  How long do reports stay active?
                </h4>
                <p className="text-gray-700">
                  Reports expire based on their type: Heavy Traffic (2 hours), Accidents and Checkpoints
                  (4 hours), Hazards (24 hours), Potholes (7 days), Roadblocks (14 days), and Construction
                  (30 days). Expired reports are automatically marked as expired.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Can I delete my reports or comments?
                </h4>
                <p className="text-gray-700">
                  Currently, users cannot delete their own content. If you need content removed, please 
                  contact support with the report ID or details. Administrators can remove content that 
                  violates our guidelines. Deleting your account deletes everything you posted.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  How do I delete my account?
                </h4>
                <p className="text-gray-700">
                  In the app, open Profile and tap Delete account; on the website, open the account menu
                  and choose Delete account. You will be asked for your password. Your profile, contacts,
                  trips and anything you posted are deleted straight away. If a trip is running, end it
                  first. The{' '}
                  <Link href="/delete-account" className="text-blue-600 hover:underline">
                    Delete your account
                  </Link>{' '}
                  page has the full details.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Why is my photo upload failing?
                </h4>
                <p className="text-gray-700">
                  Check your internet connection first. Each photo must be a JPEG, PNG or WebP image of 5MB or
                  less; it is compressed before upload. You can add up to 5 photos per report.
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
              <p className="text-red-800 mb-2">
                WakaGuard is not an emergency service and does not replace calling 112. If you or someone
                else is in danger, call 112 (Nigeria&apos;s emergency number) first.
              </p>
              <p className="text-red-800">
                Safe Trip alerts and the SOS button text the contacts you chose. WakaGuard does not contact
                the police, an ambulance or any other responder for you, and nobody at WakaGuard watches
                alerts as they come in. A text can also be delayed or fail to arrive, so do not rely on
                WakaGuard as your only way of getting help.
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
              <strong>We&apos;re here to help!</strong> Don&apos;t hesitate to reach out if you have any questions or concerns.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
