'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Users, Phone, X, Check, Loader2,
  ChevronRight, Heart, Car, Lightbulb, UserPlus, Trash2, CheckCircle2,
  AlertCircle, Flame, Ambulance, ShieldCheck, Plus,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useSafety } from '@/hooks/useSafety';
import { useBackToClose } from '@/hooks/useBackToClose';
import { useKeyboardSafeOverlay } from '@/hooks/useKeyboardSafeOverlay';
import { hasSeenLocationExplanation, rememberLocationExplanation } from '@/lib/locationConsent';
import { LocationExplanation } from '@/components/mobile/trip/LocationExplanation';
import { askToShowNotifications } from '@/lib/nativeNotifications';
import { MAX_TRUSTED_CONTACTS, formatDuration, joinNames } from '@/lib/tripPlanning';
import { reachedServer, retryStuckSaves } from '@/lib/firestoreWrites';
import { StartTripForm, StartTripRequest } from '@/components/mobile/trip/StartTripForm';
import { ActiveTripCard } from '@/components/mobile/trip/ActiveTripCard';
import { TripMapScreen } from '@/components/mobile/trip/TripMapScreen';
import { getDeviceId, sendsTripLocation } from '@/lib/deviceId';
import { askedForNoTexts, canBeTexted, readContactPhone } from '@/lib/contactPhone';
import { describeTripAlert } from '@/lib/alertOutcome';
import { registerForPush } from '@/lib/pushRegistration';
import { 
  sendCheckinSms,
  sendTripShareSms,
  buildShareLink,
  buildSosShareText,
  openWhatsAppShare,
} from '@/lib/safetyMessaging';
import { useAuthedUser } from '@/hooks/useAuthedUser';
import { useRecentPosition } from '@/hooks/useRecentPosition';
import { useRequireAccount } from '@/hooks/useRequireAccount';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, waitForPendingWrites } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TripStatus } from '@/lib/types';
import { Capacitor } from '@capacitor/core';
import { shareSafeTripLink } from '@/lib/share';
import { AuthModal } from '@/components/AuthModal';
import { AppNotices } from '@/components/mobile/AppNotices';
import { AddTimeSheet } from '@/components/mobile/trip/AddTimeSheet';
import { ArriveUndoBar } from '@/components/mobile/trip/ArriveUndoBar';
import { VehicleSheet } from '@/components/mobile/trip/VehicleSheet';
import { storedVehicle, Vehicle } from '@/lib/vehicle';
import { ARRIVE_UNDO_MS } from '@/lib/arriveUndo';
import { TRAVEL_MODES, TravelMode, isTravelMode, lastTravelMode, tipsFor, tipsHeading } from '@/lib/travelMode';
import { TravelPicture } from '@/components/pictures/Pictures';
import { hasDoneKeepRunning, rememberKeepRunningDone, shouldOfferKeepRunning } from '@/lib/keepRunning';
import { KeepRunningHelp } from '@/components/mobile/KeepRunningHelp';
import { KeepRunningAsk } from '@/components/mobile/KeepRunningAsk';
import { shouldAskAfterTrip } from '@/lib/keepRunningPermission';
import { keepTripRoute } from '@/lib/directionsFetch';
import { pickPhoneContact } from '@/lib/contactPicker';
import { BUTTON_ADDS_MINUTES, forgetPendingPress, noteDeadlineAtPress, TripNotificationAction } from '@/lib/tripNotificationActions';

type ModalType = 'sos' | 'contacts' | 'emergency' | null;

const moreRow = 'w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors';
const moreIcon = 'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0';
const moreTitle = 'block font-semibold text-slate-900 dark:text-white';
const moreSub = 'block text-sm text-slate-500 dark:text-slate-400';

// Nigerian Emergency Numbers
const EMERGENCY_CONTACTS = [
  { name: 'General Emergency', number: '112', icon: Phone, color: 'red', description: 'National emergency line' },
  { name: 'Police', number: '199', icon: ShieldCheck, color: 'blue', description: 'Nigeria Police Force' },
  { name: 'FRSC', number: '122', icon: Car, color: 'green', description: 'Federal Road Safety Corps' },
  { name: 'Fire Service', number: '199', icon: Flame, color: 'orange', description: 'Fire emergency' },
  { name: 'Ambulance (LASAMBUS)', number: '112', icon: Ambulance, color: 'red', description: 'Lagos State Ambulance' },
  { name: 'NEMA', number: '0800CALLNEMA', icon: AlertCircle, color: 'amber', description: 'Emergency Management Agency' },
];

// A checklist for a private car, where the driver is the one who can check these
const SAFETY_CHECKLIST = [
  { id: 'tires', label: 'Checked tyre pressure and condition', category: 'Vehicle' },
  { id: 'brakes', label: 'Tested brakes', category: 'Vehicle' },
  { id: 'lights', label: 'All lights working', category: 'Vehicle' },
  { id: 'fuel', label: 'Sufficient fuel', category: 'Vehicle' },
  { id: 'documents', label: "Driver's licence and vehicle papers available", category: 'Documents' },
  { id: 'insurance', label: 'Valid insurance', category: 'Documents' },
  { id: 'phone', label: 'Phone fully charged', category: 'Emergency' },
  { id: 'contacts', label: 'Emergency contacts updated', category: 'Emergency' },
  { id: 'firstaid', label: 'First aid kit available', category: 'Emergency' },
  { id: 'water', label: 'Water and snacks for long trips', category: 'Comfort' },
];

export function SafetyScreen({ onReportRoad, notificationAction = null, onNotificationActionDone }: {
  /** Open the road report form */
  onReportRoad?: () => void;
  /** A button pressed on a trip reminder, to carry out once the trip has loaded */
  notificationAction?: TripNotificationAction | null;
  onNotificationActionDone?: () => void;
} = {}) {
  const { uid, ready: authReady, isAnonymous, displayName } = useAuthedUser();
  const { requireAccount, showAuthModal, openAuthModal, closeAuthModal } = useRequireAccount({ uid, isAnonymous });
  const {
    activeTrip,
    activeTripUnsynced,
    startSafeTrip,
    endSafeTrip,
    extendSafeTrip,
    sendTripLocationFromHere,
    setTripVehicle,
    triggerSOS,
    logCheckpointStop,
    loading,
  } = useSafety();

  // Someone who allowed notifications earlier is registered again at launch, in
  // case the phone's token has changed
  useEffect(() => {
    if (uid && !isAnonymous) void registerForPush(uid);
  }, [uid, isAnonymous]);

  // Derived from the trip so the share options survive an app restart mid-trip
  const shareUrl = activeTrip ? buildShareLink(activeTrip.id) : null;

  // The trip on a map. The phone's Back button closes it instead of leaving the app.
  const [tripMapOpen, setTripMapOpen] = useState(false);
  const openTripMap = () => setTripMapOpen(true);
  const closeTripMap = () => setTripMapOpen(false);
  useBackToClose(tripMapOpen, closeTripMap);

  // Starting or ending a trip swaps what is at the top of the screen, so bring it back into view
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTripId = activeTrip?.id ?? null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTripId]);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Name shown to contacts in alerts; null until the user document has loaded
  const [savedAlertName, setSavedAlertName] = useState<string | null>(null);

  // Trusted contacts
  const [trustedContacts, setTrustedContacts] = useState<{ id: string; name: string; phone?: string; phoneE164?: string; email?: string; smsOptedOut?: boolean }[]>([]);
  // The server only texts contacts with a full number saved, so only these count as people who are told
  const textableContacts = trustedContacts.filter(canBeTexted);
  const untextableCount = trustedContacts.length - textableContacts.length;
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  useBackToClose(activeModal !== null, () => setActiveModal(null));
  // It has boxes to type in, which the iPhone's keyboard would otherwise cover
  const { ref: contactsRef, style: contactsStyle } = useKeyboardSafeOverlay();

  // Collapsible sections
  const [tipsExpanded, setTipsExpanded] = useState(false);
  // On phones known to close apps in the background, the steps that stop that
  // are put in front of the person once, without waiting for a trip to go quiet
  const [keepRunningDue, setKeepRunningDue] = useState(() => (
    typeof navigator !== 'undefined'
    && shouldOfferKeepRunning(Capacitor.getPlatform(), navigator.userAgent, hasDoneKeepRunning())
  ));
  const [showKeepRunning, setShowKeepRunning] = useState(false);
  useBackToClose(showKeepRunning, () => setShowKeepRunning(false));
  // Once, after the first trip on an Android phone: Android's own "always run in
  // the background?" question, in place of the steps through Settings (build 25)
  const [askKeepRunning, setAskKeepRunning] = useState(false);
  useBackToClose(askKeepRunning, () => setAskKeepRunning(false));
  // Whose tips the card shows: the one tapped there, else this trip's, else last time's
  const [tipsModeChosen, setTipsModeChosen] = useState<TravelMode | null>(null);
  const [rememberedMode, setRememberedMode] = useState<TravelMode | null>(() => lastTravelMode());
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  
  // Load the profile and the trusted contacts
  useEffect(() => {
    if (!uid || isAnonymous) return;
    // Each part is loaded on its own: with no connection and nothing cached a
    // read fails, and that must not leave the form stuck on its loading state
    const loadProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setCheckedItems(userDoc.data().safetyChecklist || []);
        }
        setSavedAlertName(userDoc.data()?.alertName || '');
      } catch (error) {
        console.warn('Could not load profile:', error);
        setSavedAlertName('');
      }
    };
    loadProfile();
    // Contacts are listened to, not read once. A single read that failed (a
    // fresh install, with nothing kept on the phone and a slow first
    // connection) left the list empty until the Trip tab was opened again, and
    // adding a contact then looked as if it had failed (the owner's iPhone, 18
    // October 2026). The listener fills the list in when the connection comes,
    // and shows the server's own changes, such as a contact who asked for no
    // more texts (smsOptedOut), straight away.
    return onSnapshot(
      collection(db, 'users', uid, 'trustedContacts'),
      (snap) => setTrustedContacts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      (error) => console.warn('Could not load trusted contacts:', error)
    );
  }, [uid]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // "I've arrived" or extra time saved on the phone but not yet received by the
  // server. Until it is, the server goes by what it last knew and may alert the
  // contacts, so this stays on screen until it lands, and its arrival is told.
  const [unsentChange, setUnsentChange] = useState<'end' | 'extend' | null>(null);
  // "More time…": any amount of extra time, from the trip card or a reminder's button
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  // Vehicle details on the running trip
  const [vehicleOpen, setVehicleOpen] = useState(false);
  // "I've arrived" on the card waits a few seconds with an Undo (lib/arriveUndo.ts)
  const [endingSince, setEndingSince] = useState<number | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endNowRef = useRef<() => void>(() => {});
  const waitUntilReceived = (change: 'end' | 'extend') => {
    setUnsentChange(change);
    waitForPendingWrites(db).then(
      () => {
        setUnsentChange((now) => (now === change ? null : now));
        showToast(change === 'end' ? 'WakaGuard has your arrival now. Trip ended.' : 'WakaGuard has your extra time now.', 'success');
      },
      () => {}
    );
  };

  // The phone's latest position, kept ready for SOS and "I'm okay" messages.
  // Asked for again when the SOS dialog opens, so it is seconds old by the
  // time a button in it is tapped.
  const { hasFix, current: currentPosition, refresh: refreshPosition } = useRecentPosition();
  useEffect(() => {
    if (activeModal === 'sos') refreshPosition();
  }, [activeModal, refreshPosition]);

  // Call 112. Works for everyone, signed in or not; when signed in the server
  // also messages trusted contacts.
  const handleSOS = async () => {
    // A test trip never calls the emergency line
    if (activeTrip?.isTest) return;
    setProcessing(true);
    const result = await triggerSOS({ knownLocation: currentPosition() });
    setProcessing(false);
    setActiveModal(null);
    const willAlertContacts = !!uid && !isAnonymous && textableContacts.length > 0;
    showToast(
      willAlertContacts && result.success
        ? 'Calling 112. Your contacts are being alerted.'
        : 'Calling 112.',
      'success'
    );
  };

  // Alert trusted contacts without placing a call
  const handleSosContactsOnly = async () => {
    if (!requireAccount('alert contacts')) return;
    if (!uid || isAnonymous) return;
    if (textableContacts.length === 0) {
      showToast(
        untextableCount > 0
          ? 'None of your contacts can be texted. Open Trusted contacts to see why.'
          : 'No trusted contacts. Add contacts first.',
        'error'
      );
      return;
    }

    setProcessing(true);
    const result = await triggerSOS({ call: false, knownLocation: currentPosition() });
    setProcessing(false);
    setActiveModal(null);
    showToast(
      result.confirmed
        ? 'Your contacts are being alerted by SMS.'
        : 'Alert saved. It will send as soon as your phone has signal.',
      'success'
    );
  };

  // Send check-in SMS to trusted contacts
  const handleCheckinSms = async () => {
    if (!requireAccount('send check-in SMS')) return;
    if (!uid || isAnonymous) return;
    if (textableContacts.length === 0) {
      showToast(
        untextableCount > 0
          ? 'None of your contacts can be texted. Open Trusted contacts to see why.'
          : 'No trusted contacts. Add contacts first.',
        'error'
      );
      return;
    }
    
    setProcessing(true);
    try {
      // An old position is left out rather than sent as where you are now
      const position = currentPosition();
      const result = await sendCheckinSms(undefined, position?.lat, position?.lng) as any;
      if (result.success) {
        showToast(`Text sent to ${result.sent} ${result.sent === 1 ? 'contact' : 'contacts'}`, 'success');
      } else if (result.status === 'blocked') {
        showToast(result.message || 'SMS not available yet. Use WhatsApp instead.', 'error');
      } else {
        showToast('Failed to send check-in SMS', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send check-in SMS', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Share via WhatsApp (SOS)
  const handleSosWhatsApp = () => {
    const position = currentPosition();
    if (!position) {
      refreshPosition();
      showToast('Location unavailable. Please enable location.', 'error');
      return;
    }
    const text = buildSosShareText(position.lat, position.lng);
    openWhatsAppShare(text);
  };

  // Share via WhatsApp (Trip)
  // The first trip on this phone waits for the traveller to read how their
  // location is used. It must come before the phone's own permission question.
  const [awaitingLocationConsent, setAwaitingLocationConsent] = useState<StartTripRequest | null>(null);
  useBackToClose(awaitingLocationConsent !== null, () => setAwaitingLocationConsent(null));

  const tipsMode: TravelMode | null = tipsModeChosen
    ?? (isTravelMode(activeTrip?.travelMode) ? activeTrip.travelMode : rememberedMode);

  const handleStartTrip = async (request: StartTripRequest) => {
    if (!requireAccount('start safe trip')) return;
    if (!uid || isAnonymous) return;
    setRememberedMode(request.travelMode);
    setTipsModeChosen(null);
    if (!hasSeenLocationExplanation()) {
      setAwaitingLocationConsent(request);
      return;
    }
    setProcessing(true);

    // The name goes into texts to contacts, so save it before the trip exists.
    // The trip still starts if this fails; the server falls back to the sign-in name.
    // It is not waited for: with no connection the save stays queued, and waiting
    // on it would hold up the trip itself.
    if (request.alertName !== savedAlertName) {
      setSavedAlertName(request.alertName);
      updateDoc(doc(db, 'users', uid), { alertName: request.alertName })
        .catch((error) => console.error('Failed to save alert name:', error));
    }

    // First trip only: the "Safe Trip active" notification and the warning that
    // comes before contacts are alerted both need this. Asked before the trip
    // starts so it cannot collide with the location prompt that follows.
    const notificationsAllowed = await askToShowNotifications();
    // Lets the server send "Are you okay?" when the arrival time passes. Not
    // waited for: the trip must not hang on it.
    if (notificationsAllowed) void registerForPush(uid);

    const result = await startSafeTrip({
      expectedDurationMinutes: request.durationMinutes,
      destinationLabel: request.destination,
      trustedContactIds: request.contactIds,
      isTest: request.isTest,
      travelMode: request.travelMode,
      textOnArrival: request.textOnArrival,
      vehicle: request.vehicle,
      destinationPoint: request.destinationPoint,
    });

    if (!result.success || !result.tripId) {
      setProcessing(false);
      showToast(result.error || 'Failed to start Safe Trip', 'error');
      return;
    }

    // No connection: the trip is saved on the phone and sent when it can be.
    // Until then nobody is watching it, and the card says so.
    if (result.pending) {
      setProcessing(false);
      showToast('No connection yet. This trip starts being watched once your phone is back online.', 'error');
      return;
    }

    // Asked now the trip is running, so the reason is plain and the trip is not held up
    void shouldAskAfterTrip().then((ask) => { if (ask) setAskKeepRunning(true); });
    // Directions (Beta): the route found on the form is followed without asking Mapbox again
    if (request.route) keepTripRoute(result.tripId, request.route);

    const watchers = joinNames(
      trustedContacts.filter((c) => request.contactIds.includes(c.id)).map((c) => c.name)
    );

    // Says the length, so a trip started at the wrong length is noticed at once
    const started = request.isTest
      ? `${formatDuration(request.durationMinutes)} test trip started.`
      : `${formatDuration(request.durationMinutes)} trip started.`;

    if (!request.textContacts) {
      setProcessing(false);
      showToast(
        request.isTest
          ? `${started} End it when you like, or let it run to see the alert.`
          : `${started} Share the link so your contacts can follow it.`,
        'success'
      );
      return;
    }

    try {
      const sms = await sendTripShareSms(result.tripId);
      showToast(
        sms.success
          ? `${started} ${watchers} ${request.contactIds.length === 1 ? 'was' : 'were'} sent the link.`
          : `${started} The text could not be sent, so share the link below instead.`,
        sms.success ? 'success' : 'error'
      );
    } catch (error) {
      console.error('Trip share SMS failed:', error);
      showToast(`${started} The text could not be sent, so share the link below instead.`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  /** Ends the trip; true once it has been ended (or saved on the phone to be sent) */
  const handleEndSafeTrip = async (): Promise<boolean> => {
    if (!requireAccount('end safe trip')) return false;
    if (!uid || isAnonymous) return false;
    const currentShareUrl = shareUrl;
    const currentDestination = activeTrip?.destination;
    // The server follows up with contacts only if it texted them, so only then is one promised
    const alertBefore = activeTrip ? describeTripAlert(activeTrip) : null;
    const contactsWereTexted = !!alertBefore?.texted;
    // "Text them when I arrive" was ticked: the server texts them (tripMonitor.ts)
    const arrivalTexted = !contactsWereTexted && activeTrip?.textOnArrival === true && textableContacts.length > 0;
    
    setProcessing(true);
    const result = await endSafeTrip();
    setProcessing(false);
    setActiveModal(null);
    
    if (result.success && result.pending) {
      waitUntilReceived('end');
    } else if (result.success) {
      showToast(
        arrivalTexted
          ? 'Trip ended. Glad you made it. Your contacts are being told you arrived.'
          : !contactsWereTexted
          ? 'Trip ended. Glad you made it.'
          : alertBefore?.kind === 'sos'
            ? 'Trip ended. Your contacts are being told you ended the SOS.'
            : 'Trip ended. Your contacts are being told you checked in.',
        'success'
      );
      // Contacts who were alerted get a text from the server. Otherwise offer
      // to let them know through the share sheet.
      if (currentShareUrl && !contactsWereTexted && !arrivalTexted && !result.pending) {
        try {
          await shareSafeTripLink(currentShareUrl, { mode: 'end', destination: currentDestination });
        } catch (e) {
          console.warn('End trip share cancelled:', e);
        }
      }
    } else {
      showToast(result.error || 'Failed to end trip', 'error');
    }
    return result.success;
  };

  /** "I've arrived" on the card or trip map: ends after the undo wait, or at once if the app is put away */
  const startEnding = () => {
    if (endTimer.current !== null || processing) return;
    setEndingSince(Date.now());
    endTimer.current = setTimeout(() => endNowRef.current(), ARRIVE_UNDO_MS);
  };
  const stopWaiting = () => {
    if (endTimer.current !== null) clearTimeout(endTimer.current);
    endTimer.current = null;
    setEndingSince(null);
  };
  // Read when the wait runs out, so the end uses the screen as it is then
  endNowRef.current = () => {
    if (endTimer.current === null) return;
    stopWaiting();
    void handleEndSafeTrip();
  };
  // Put away or locked during the wait: end now. Waiting would leave the
  // trip running, watched, after they said they had arrived
  useEffect(() => {
    if (endingSince === null) return;
    const endIfHidden = () => {
      if (document.visibilityState === 'hidden') endNowRef.current();
    };
    document.addEventListener('visibilitychange', endIfHidden);
    window.addEventListener('pagehide', endIfHidden);
    return () => {
      document.removeEventListener('visibilitychange', endIfHidden);
      window.removeEventListener('pagehide', endIfHidden);
    };
  }, [endingSince]);
  useEffect(() => () => {
    if (endTimer.current !== null) clearTimeout(endTimer.current);
  }, []);
  // The trip ended some other way meanwhile (another phone, a reminder's button): nothing left to wait for
  useEffect(() => {
    if (!activeTrip && endingSince !== null) stopWaiting();
  }, [activeTrip, endingSince]);

  const handleSaveVehicle = async (vehicle: Vehicle | null) => {
    setVehicleOpen(false);
    setProcessing(true);
    const result = await setTripVehicle(vehicle);
    setProcessing(false);
    if (!result.success) showToast(result.error || 'Could not save the vehicle', 'error');
    else if (result.pending) showToast('Saved on this phone. It will be sent when you are back online.', 'error');
    else showToast(vehicle ? 'Vehicle details saved' : 'Vehicle details removed', 'success');
  };

  /** Adds time; true once it has been added (or saved on the phone to be sent) */
  const handleExtendTrip = async (minutes: number): Promise<boolean> => {
    if (!uid || isAnonymous) return false;
    setProcessing(true);
    const result = await extendSafeTrip(minutes);
    setProcessing(false);
    if (result.success && result.pending) {
      waitUntilReceived('extend');
    } else if (result.success) {
      showToast(`Added ${formatDuration(minutes)}`, 'success');
    } else {
      showToast(result.error || 'Failed to add time', 'error');
    }
    return result.success;
  };

  // "I've arrived" or "+15 min" pressed on a reminder: the same as the buttons on
  // the trip card, for that trip only. The screen may have just opened, so the
  // trip is waited for; only the trip itself, read from the database, can say it
  // has ended. An old reminder never ends an SOS.
  useEffect(() => {
    if (!notificationAction || !authReady) return;
    const done = () => onNotificationActionDone?.();
    if (!uid || isAnonymous || notificationAction.action === 'open') {
      done();
      return;
    }
    if (activeTrip?.id === notificationAction.tripId && activeTrip.status === TripStatus.ACTIVE) {
      if (processing) return;
      done();
      const deadline = activeTrip.endsAt?.toMillis() ?? null;
      // Begun before the app reloaded, and the time has already moved: it was added then
      if (notificationAction.action === 'add15' && notificationAction.deadlineMs != null && deadline !== notificationAction.deadlineMs) {
        forgetPendingPress();
        return;
      }
      if (notificationAction.action === 'more') {
        // Nothing is changed until they choose an amount
        forgetPendingPress();
        setAddTimeOpen(true);
        return;
      }
      noteDeadlineAtPress(deadline);
      // The press stays kept on the phone until this has worked, in case the app reloads meanwhile
      void (notificationAction.action === 'arrived' ? handleEndSafeTrip() : handleExtendTrip(BUTTON_ADDS_MINUTES))
        .then((worked) => { if (worked) forgetPendingPress(); });
      return;
    }
    let current = true;
    void getDoc(doc(db, 'users', uid, 'trips', notificationAction.tripId)).then((trip) => {
      const status = trip.data()?.status;
      // Still running: this screen has not loaded it yet, and runs this again when it has
      if (!current || status === TripStatus.ACTIVE) return;
      done();
      forgetPendingPress();
      showToast(
        status === TripStatus.EMERGENCY
          ? 'Your SOS is still on. To end it, use the trip card.'
          : 'That trip has already ended.',
        'success'
      );
    }).catch(() => {});
    return () => {
      current = false;
    };
    // Runs once per press: the press is cleared as soon as it is taken up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationAction, authReady, uid, isAnonymous, activeTrip, processing]);

  const handleSendFromHere = async () => {
    if (!uid || isAnonymous) return;
    setProcessing(true);
    const result = await sendTripLocationFromHere();
    setProcessing(false);
    if (result.success && result.pending) {
      showToast('Saved on this phone. It takes over once you are back online.', 'error');
    } else if (result.success) {
      showToast("This phone is now sending the trip's location", 'success');
    } else {
      showToast(result.error || 'Could not switch to this phone', 'error');
    }
  };

  const handleShareLink = async () => {
    if (!shareUrl) return;
    try {
      await shareSafeTripLink(shareUrl, { mode: 'start', destination: activeTrip?.destination });
    } catch (e) {
      console.warn('Share cancelled/failed:', e);
    }
  };

  const handleCheckpointStop = async () => {
    if (!requireAccount('checkpoint stop')) return;
    if (!uid || isAnonymous) return;
    setProcessing(true);
    const result = await logCheckpointStop();
    setProcessing(false);
    if (result.success) {
      showToast('Checkpoint stop logged.', 'success');
    } else {
      showToast(result.error || 'Failed to log checkpoint', 'error');
    }
  };

  // Pick contact from phone
  const handlePickFromPhone = async () => {
    // In the app: the phone's own contacts screen. The person picks one number
    // and only that entry reaches the app, so no permission to read contacts is needed.
    if (Capacitor.isNativePlatform()) {
      try {
        const picked = await pickPhoneContact();
        if (picked) {
          setNewContactName(picked.name);
          setNewContactPhone(picked.phone);
          showToast('Contact selected - tap Add to save', 'success');
        }
      } catch (error) {
        console.error('Contact picker error:', error);
        showToast('Could not open your contacts. Enter the name and number below.', 'error');
      }
      return;
    }

    // Web fallback: Try Web Contact Picker API (Chrome on Android)
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        // @ts-ignore - Web Contacts API
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          const name = contact.name?.[0] || 'Unknown';
          const phone = contact.tel?.[0] || '';
          if (phone) {
            setNewContactName(name);
            setNewContactPhone(phone.replace(/\s/g, ''));
            showToast('Contact selected - tap Add to save', 'success');
          } else {
            showToast('Selected contact has no phone number', 'error');
          }
        }
        return;
      } catch (error: any) {
        if (!error.message?.includes('canceled') && !error.message?.includes('cancelled')) {
          console.warn('Web Contact Picker failed');
        } else {
          return; // User cancelled
        }
      }
    }

    // Final fallback - manual input
    showToast('Enter contact details manually below', 'success');
  };

  // Add trusted contact
  const handleAddContact = async () => {
    if (!requireAccount('add trusted contact')) return;
    if (!uid || isAnonymous || !newContactName.trim() || !newContactPhone.trim()) {
      showToast('Please enter name and phone number', 'error');
      return;
    }
    
    setProcessing(true);
    try {
      const name = newContactName.trim();
      const rawPhone = newContactPhone.trim();
      
      // Only a number the server can text is saved; anything else is sent back to be completed
      const read = readContactPhone(rawPhone);
      if (!read.ok) {
        showToast(read.error, 'error');
        setProcessing(false);
        return;
      }
      const phoneE164 = read.phoneE164;
      
      const contactIdBase = phoneE164.replace(/[^0-9]/g, '');
      const contactId = contactIdBase.length > 0 ? contactIdBase : String(Date.now());

      // The server messages at most this many contacts per alert
      const isNewContact = !trustedContacts.some((c) => c.id === contactId);
      if (isNewContact && trustedContacts.length >= MAX_TRUSTED_CONTACTS) {
        showToast(`You can have up to ${MAX_TRUSTED_CONTACTS} trusted contacts. Remove one to add another.`, 'error');
        setProcessing(false);
        return;
      }

      const saved = await reachedServer(setDoc(doc(db, 'users', uid, 'trustedContacts', contactId), {
        name,
        phone: rawPhone,
        phoneE164,
        notifyOnSOS: true,
        notifyOnCheckIn: true,
        notifyOnTripShare: true,
        createdAt: serverTimestamp(),
      }, { merge: true }));

      setTrustedContacts((prev) => {
        const existing = prev.find((c) => c.id === contactId);
        if (existing) {
          return prev.map((c) => (c.id === contactId ? { ...c, name, phone: rawPhone, phoneE164 } : c));
        }
        return [...prev, { id: contactId, name, phone: rawPhone, phoneE164 }];
      });
      setNewContactName('');
      setNewContactPhone('');
      showToast(
        saved ? 'Contact added' : 'Contact saved on this phone. It will be sent when you are back online.',
        saved ? 'success' : 'error'
      );
    } catch (error) {
      showToast('Failed to add contact', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Remove trusted contact
  const handleRemoveContact = async (contact: { id: string; name: string; phone?: string; phoneE164?: string }) => {
    if (!requireAccount('remove trusted contact')) return;
    if (!uid || isAnonymous) return;
    
    setProcessing(true);
    try {
      await deleteDoc(doc(db, 'users', uid, 'trustedContacts', contact.id));
      setTrustedContacts((prev) => prev.filter((c) => c.id !== contact.id));
      showToast('Contact removed', 'success');
    } catch (error) {
      showToast('Failed to remove contact', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle checklist item
  const handleToggleChecklist = async (itemId: string) => {
    if (!requireAccount('update checklist')) return;
    if (!uid || isAnonymous) return;
    
    const newChecked = checkedItems.includes(itemId)
      ? checkedItems.filter(id => id !== itemId)
      : [...checkedItems, itemId];
    
    setCheckedItems(newChecked);
    
    try {
      await updateDoc(doc(db, 'users', uid), {
        safetyChecklist: newChecked
      });
    } catch (error) {
      console.error('Failed to save checklist:', error);
    }
  };

  // Reset checklist
  const handleResetChecklist = async () => {
    if (!requireAccount('reset checklist')) return;
    if (!uid || isAnonymous) return;
    setCheckedItems([]);
    try {
      await updateDoc(doc(db, 'users', uid), {
        safetyChecklist: []
      });
      showToast('Checklist reset', 'success');
    } catch (error) {
      showToast('Failed to reset', 'error');
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
      </div>
    );
  }

  // Show login prompt for guests
  if (!uid || isAnonymous) {
    return (
      <div className="absolute inset-0 overflow-y-auto px-4 pt-20 pb-28 bg-slate-50 dark:bg-slate-900" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
        <AppNotices />
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-brand-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Safe Trip</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6 px-4">
            Start a trip and say when you should arrive. If you don&apos;t, the people you chose get a text with
            your last location. Sign in to use it.
          </p>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-2xl font-semibold hover:bg-brand-700 transition-colors"
          >
            Sign in to continue
          </button>
        </div>

        {/* Emergency Numbers - Always Available */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 px-2">Emergency Numbers</h2>
          <div className="grid grid-cols-2 gap-3">
            {EMERGENCY_CONTACTS.slice(0, 4).map((contact) => (
              <a
                key={contact.name}
                href={`tel:${contact.number}`}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 bg-${contact.color}-100`}>
                  <Phone className={`w-6 h-6 text-${contact.color}-600`} />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{contact.name}</p>
                <p className="text-blue-600 font-bold">{contact.number}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Without this the sign-in button above has nothing to open */}
        <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
      </div>
    );
  }

  // Contacts told about the active trip (all of them for trips started before contacts could be chosen)
  const tripContactIds = activeTrip?.trustedContactIds;
  const watcherNames = textableContacts
    .filter((c) => !tripContactIds || tripContactIds.length === 0 || tripContactIds.includes(c.id))
    .map((c) => c.name);

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto px-4 pt-4 pb-28 space-y-4 bg-slate-50 dark:bg-slate-900 touch-pan-y" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 56px)', WebkitOverflowScrolling: 'touch' }}>
      <AppNotices />
      {unsentChange && (
        <section
          role="status"
          aria-labelledby="unsent-change-title"
          className="rounded-3xl border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-5"
        >
          <h2 id="unsent-change-title" className="font-bold text-amber-950 dark:text-amber-50">
            {unsentChange === 'end'
              ? 'Your arrival has not reached WakaGuard yet'
              : 'Your extra time has not reached WakaGuard yet'}
          </h2>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
            {unsentChange === 'end'
              ? 'Until it does, your contacts could still be alerted. Keep WakaGuard open: it is sent by itself as soon as the connection works.'
              : 'Until it does, your contacts could still be alerted at the old time. Keep WakaGuard open: it is sent by itself as soon as the connection works.'}
          </p>
          <button
            type="button"
            onClick={() => void retryStuckSaves()}
            className="mt-4 w-full py-2.5 rounded-xl bg-amber-900 text-white font-semibold hover:bg-amber-950"
          >
            Try again now
          </button>
        </section>
      )}
      {keepRunningDue && (
        <section
          aria-labelledby="keep-running-card-title"
          className="rounded-3xl border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-5"
        >
          <h2 id="keep-running-card-title" className="font-bold text-amber-950 dark:text-amber-50">
            Your phone may stop WakaGuard when you leave the app
          </h2>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
            Infinix, Tecno and itel phones close apps to save battery. If that happens during a trip, your contacts
            stop seeing where you are. A few settings, changed once, prevent it.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowKeepRunning(true)}
              className="flex-1 py-2.5 rounded-xl bg-amber-900 text-white font-semibold hover:bg-amber-950"
            >
              Show me how
            </button>
            <button
              type="button"
              onClick={() => {
                rememberKeepRunningDone();
                setKeepRunningDue(false);
              }}
              className="flex-1 py-2.5 rounded-xl bg-white text-amber-950 font-semibold border border-amber-300 hover:bg-amber-100"
            >
              I&apos;ve done this
            </button>
          </div>
        </section>
      )}
      {showKeepRunning && <KeepRunningHelp onClose={() => setShowKeepRunning(false)} />}
      {askKeepRunning && <KeepRunningAsk onDone={() => setAskKeepRunning(false)} />}
      {endingSince !== null && <ArriveUndoBar startedMs={endingSince} onUndo={stopWaiting} />}
      {vehicleOpen && activeTrip && (
        <VehicleSheet
          current={storedVehicle(activeTrip.vehicle)}
          processing={processing}
          onClose={() => setVehicleOpen(false)}
          onSave={(vehicle) => void handleSaveVehicle(vehicle)}
        />
      )}
      {addTimeOpen && activeTrip && (
        <AddTimeSheet
          endsAtMs={activeTrip.endsAt?.toMillis() ?? null}
          processing={processing}
          onClose={() => setAddTimeOpen(false)}
          onAdd={(minutes) => {
            setAddTimeOpen(false);
            void handleExtendTrip(minutes);
          }}
        />
      )}

      {/* ============================================ */}
      {/* 1. THE TRIP: start form, or the trip in progress */}
      {/* ============================================ */}
      {activeTrip ? (
        <ActiveTripCard
          trip={activeTrip}
          watcherNames={watcherNames}
          unsynced={activeTripUnsynced}
          locationFromElsewhere={!sendsTripLocation(activeTrip.trackingDeviceId, getDeviceId())}
          processing={processing || endingSince !== null}
          onArrive={startEnding}
          onExtend={handleExtendTrip}
          onMoreTime={() => setAddTimeOpen(true)}
          onEditVehicle={() => setVehicleOpen(true)}
          onSendFromHere={handleSendFromHere}
          onViewMap={openTripMap}
          onShare={handleShareLink}
          onTextOkay={handleCheckinSms}
          onReportRoad={onReportRoad}
          onSOS={() => setActiveModal('sos')}
        />
      ) : savedAlertName === null ? (
        <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
        </div>
      ) : (
        <StartTripForm
          contacts={trustedContacts}
          alertName={savedAlertName || displayName || ''}
          alertNameSaved={!!savedAlertName}
          processing={processing}
          onStart={handleStartTrip}
          newContactName={newContactName}
          newContactPhone={newContactPhone}
          onNewContactNameChange={setNewContactName}
          onNewContactPhoneChange={setNewContactPhone}
          onAddContact={handleAddContact}
          onPickFromPhone={handlePickFromPhone}
          onManageContacts={() => setActiveModal('contacts')}
        />
      )}

      {/* ============================================ */}
      {/* 2. EMERGENCY SOS (the trip card has its own while a trip is running) */}
      {/* ============================================ */}
      {!activeTrip && (
        <button
          onClick={() => setActiveModal('sos')}
          className="w-full p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-left hover:border-red-300 transition-colors flex items-center gap-4"
        >
          <span className="w-11 h-11 bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-red-900 dark:text-red-100">Emergency SOS</span>
            <span className="block text-sm text-red-700 dark:text-red-300">Call 112 and alert your contacts. Use only in danger.</span>
          </span>
          <ChevronRight className="w-5 h-5 text-red-400" aria-hidden="true" />
        </button>
      )}

      {/* ============================================ */}
      {/* 3. THE REST: contacts, hotlines, checkpoint log, tips */}
      {/* ============================================ */}
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
        <button onClick={() => setActiveModal('contacts')} className={moreRow}>
          <span className={`${moreIcon} bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200`}>
            <Users className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
            <span className={moreTitle}>Trusted contacts</span>
            <span className={moreSub}>{trustedContacts.length === 0 ? 'None saved yet' : `${trustedContacts.length} saved`}</span>
            {untextableCount > 0 && (
              <span className="block text-sm font-medium text-amber-700 dark:text-amber-300">
                {untextableCount === 1 ? '1 cannot be texted' : `${untextableCount} cannot be texted`}
              </span>
            )}
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400" aria-hidden="true" />
        </button>

        <button onClick={() => setActiveModal('emergency')} className={moreRow}>
          <span className={`${moreIcon} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200`}>
            <Phone className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
            <span className={moreTitle}>Emergency numbers</span>
            <span className={moreSub}>Police, FRSC and other hotlines</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400" aria-hidden="true" />
        </button>

        <button onClick={handleCheckpointStop} disabled={processing} className={`${moreRow} disabled:opacity-50`}>
          <span className={`${moreIcon} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200`}>
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
            <span className={moreTitle}>Stopped at a checkpoint?</span>
            <span className={moreSub}>Log it with your location</span>
          </span>
          {processing
            ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin" aria-hidden="true" />
            : <ChevronRight className="w-5 h-5 text-slate-400" aria-hidden="true" />}
        </button>

        <button onClick={() => setTipsExpanded(!tipsExpanded)} aria-expanded={tipsExpanded} className={moreRow}>
          <span className={`${moreIcon} bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200`}>
            <Lightbulb className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="flex-1 min-w-0">
            <span className={moreTitle}>Safety tips</span>
            <span className={moreSub}>
              {tipsHeading(tipsMode)}
            </span>
          </span>
          {tipsExpanded
            ? <ChevronUp className="w-5 h-5 text-slate-400" aria-hidden="true" />
            : <ChevronDown className="w-5 h-5 text-slate-400" aria-hidden="true" />}
        </button>

        {tipsExpanded && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Show tips for">
              {TRAVEL_MODES.filter((mode) => mode.id !== 'other').map((mode) => {
                const selected = tipsMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={mode.label}
                    onClick={() => setTipsModeChosen(mode.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1 pt-2 pb-1.5 border-2 transition-colors ${
                      selected
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/40'
                        : 'border-transparent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <TravelPicture mode={mode.id} size={32} />
                    <span className={`text-xs font-medium leading-tight text-center ${
                      selected ? 'text-brand-800 dark:text-brand-100' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {mode.short}
                    </span>
                  </button>
                );
              })}
            </div>

            {tipsFor(tipsMode).length > 0 ? (
              <ul className="space-y-2">
                {tipsFor(tipsMode).map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-300 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {tip}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Tap how you are travelling to see the tips for it.
              </p>
            )}

            {tipsMode === 'car' && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Before you set off
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    {' '}({checkedItems.filter((id) => SAFETY_CHECKLIST.some((item) => item.id === id)).length} of {SAFETY_CHECKLIST.length} checked)
                  </span>
                </h4>
                <div className="space-y-2">
                  {SAFETY_CHECKLIST.map((item) => {
                    const done = checkedItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleToggleChecklist(item.id)}
                        aria-pressed={done}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                          done
                            ? 'bg-brand-50 dark:bg-brand-900/40'
                            : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          done ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-500'
                        }`}>
                          {done && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className={`text-sm ${done ? 'text-brand-800 dark:text-brand-100' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {awaitingLocationConsent && (
        <LocationExplanation
          onCancel={() => setAwaitingLocationConsent(null)}
          onContinue={() => {
            const request = awaitingLocationConsent;
            rememberLocationExplanation();
            setAwaitingLocationConsent(null);
            void handleStartTrip(request);
          }}
        />
      )}

      {activeTrip && tripMapOpen && (
        <TripMapScreen
          trip={activeTrip}
          watcherNames={watcherNames}
          processing={processing}
          onClose={closeTripMap}
          onArrive={() => {
            closeTripMap();
            startEnding();
          }}
          onExtend={handleExtendTrip}
        />
      )}

      {/* SOS Modal */}
      {activeModal === 'sos' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Emergency SOS</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full bg-slate-100">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-red-600" />
              </div>
              <p className="text-slate-600 mb-4">
                {activeTrip?.isTest
                  ? 'This is a test trip, so 112 is not called. You can still try the alert to your contacts. The text says it is a test.'
                  : textableContacts.length > 0
                    ? 'This calls emergency services (112) and alerts your trusted contacts by SMS with your location.'
                    : 'This calls emergency services (112). Add trusted contacts so they are alerted too.'}
              </p>
            </div>
            {!activeTrip?.isTest && (
              <button
                onClick={handleSOS}
                disabled={processing}
                className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
                Call 112 Now
              </button>
            )}
            
            <div className="border-t border-slate-200 pt-4 mt-4">
              <p className="text-xs text-slate-500 mb-3 text-center">
                {activeTrip?.isTest ? 'Try the alert to your contacts:' : 'If a call is not safe, alert your contacts without calling:'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSosContactsOnly}
                  disabled={processing || textableContacts.length === 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  📱 Alert by SMS
                </button>
                <button
                  onClick={handleSosWhatsApp}
                  disabled={!hasFix}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  💬 WhatsApp
                </button>
              </div>
              {textableContacts.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  {untextableCount > 0
                    ? 'None of your contacts can be texted. Open Trusted contacts to see why.'
                    : 'Add trusted contacts to enable SMS alerts'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Numbers Modal */}
      {activeModal === 'emergency' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Emergency Numbers</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full bg-slate-100">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              {EMERGENCY_CONTACTS.map((contact, index) => {
                const IconComponent = contact.icon;
                return (
                  <a
                    key={index}
                    href={`tel:${contact.number}`}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${contact.color}-100`}>
                      <IconComponent className={`w-6 h-6 text-${contact.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                      <p className="text-xs text-slate-500">{contact.description}</p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{contact.number}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Trusted Contacts Modal */}
      {activeModal === 'contacts' && (
        <div ref={contactsRef} style={contactsStyle} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Trusted Contacts</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full bg-slate-100">
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="text-sm text-slate-600">These contacts will be notified in emergencies and can track your trips.</p>
              
              {/* Add Contact Form */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                {/* Pick from Phone Button */}
                <button
                  onClick={handlePickFromPhone}
                  disabled={processing}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Pick from Phone Contacts
                </button>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-slate-300"></div>
                  <span className="text-xs text-slate-500">or enter manually</span>
                  <div className="flex-1 border-t border-slate-300"></div>
                </div>

                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Contact name"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={handleAddContact}
                  disabled={processing || !newContactName || !newContactPhone}
                  className="w-full py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Contact
                </button>
              </div>

              {/* Contact List */}
              {trustedContacts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Heart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No trusted contacts yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trustedContacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.phoneE164 || contact.phone}</p>
                          {askedForNoTexts(contact) ? (
                            <p className="text-xs font-medium text-amber-700 mt-0.5">
                              Asked WakaGuard not to text this number, so will not be told about your trips.
                            </p>
                          ) : !canBeTexted(contact) && (
                            <p className="text-xs font-medium text-amber-700 mt-0.5">
                              This number cannot be texted. Remove it and add it again with the full number.
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveContact(contact)}
                        disabled={processing}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
          <div className={`p-4 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          } text-white text-sm font-medium text-center`}>
            {toast.message}
          </div>
        </div>
      )}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />
    </div>
  );
}
