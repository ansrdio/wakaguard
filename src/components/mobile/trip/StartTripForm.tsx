'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, History, Lightbulb, Loader2, MapPin, Navigation, Plus, UserPlus } from 'lucide-react';
import {
  ALERT_GRACE_MINUTES,
  ARRIVAL_PRESETS,
  DEFAULT_TRIP_MINUTES,
  LONG_TRIP_PRESETS,
  MAX_ALERT_NAME_LENGTH,
  MAX_TRIP_MINUTES,
  MAX_TRUSTED_CONTACTS,
  MAX_TYPED_DESTINATION_LENGTH,
  TEST_TRIP_MINUTES,
  TripPlanErrors,
  formatClock,
  formatDuration,
  initialsOf,
  textContactsByDefault,
  validateTripPlan,
} from '@/lib/tripPlanning';
import { askedForNoTexts, canBeTexted } from '@/lib/contactPhone';
import { TRAVEL_MODES, TravelMode, isTravelMode, lastTravelMode, moreOptionsLabel, rememberTravelMode, tipBeforeSettingOff } from '@/lib/travelMode';
import { routeCannotBeRight, type UsualTrip } from '@/lib/usualTrips';
import { TravelPicture } from '@/components/pictures/Pictures';
import { VehicleFields } from '@/components/mobile/trip/VehicleFields';
import { readVehicle, Vehicle } from '@/lib/vehicle';
import { DestinationPinSheet } from '@/components/mobile/trip/DestinationPinSheet';
import { mayFillDestination, PLACE_NAME_CREDIT, Point } from '@/lib/destinationPoint';
import { askPlaceName } from '@/lib/placeName';
import { PlaceSuggestions } from '@/components/mobile/trip/PlaceSuggestions';
import { PLACE_SEARCH_CREDIT } from '@/lib/placeSearch';
import { USES_GOOGLE_MAPS } from '@/lib/googleMaps';
import { useSelectedState } from '@/hooks/useSelectedState';
import { NigerianState, STATE_CENTERS } from '@/lib/nigerianStates';
import { WeatherLine } from '@/components/mobile/trip/WeatherLine';
import { useWeatherAhead } from '@/hooks/useWeatherAhead';
import { hoursToLookAhead } from '@/lib/weatherWords';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useRoutePreview } from '@/hooks/useRoutePreview';
import { formatDistance, Route, suggestedTripMinutes } from '@/lib/directions';

export interface TripContact {
  id: string;
  name: string;
  /** Missing on a contact saved without a number the server can text */
  phoneE164?: string;
  phone?: string;
  /** They asked WakaGuard to stop texting their number (set by the server) */
  smsOptedOut?: boolean;
}

export interface StartTripRequest {
  destination: string;
  durationMinutes: number;
  contactIds: string[];
  alertName: string;
  /** Text the selected contacts the trip link as soon as the trip starts */
  textContacts: boolean;
  /** Text them when the trip ends with "I've arrived" */
  textOnArrival: boolean;
  /** A short trial run: same steps, and every text about it says it is a test */
  isTest: boolean;
  /** How they are travelling, or null when the question was left unanswered */
  travelMode: TravelMode | null;
  /** The plate and other details, if they gave any (never for a trip on foot) */
  vehicle: Vehicle | null;
  /** Where they are going, if they set it on the map (lib/destinationPoint.ts) */
  destinationPoint: Point | null;
  /** The route found for the pin, when directions (Beta) are on: the trip follows it without asking again */
  route: Route | null;
}

interface StartTripFormProps {
  contacts: TripContact[];
  /** Name already saved for alerts, or a suggestion such as the sign-in name */
  alertName: string;
  /** True when alertName was saved by the user earlier, so it need not be asked again */
  alertNameSaved: boolean;
  processing: boolean;
  onStart: (request: StartTripRequest) => void;

  // Adding a contact reuses the screen's existing contact handlers and fields,
  // so a contact picked from the phone book lands in this form
  newContactName: string;
  newContactPhone: string;
  onNewContactNameChange: (value: string) => void;
  onNewContactPhoneChange: (value: string) => void;
  onAddContact: () => void;
  onPickFromPhone: () => void;
  onManageContacts: () => void;
  /** Places they went before, to fill the form in one tap (lib/usualTrips.ts) */
  usualTrips?: UsualTrip[];
  /** "Heading out?" was tapped (build 27): the usual trip it named, to fill in once */
  usualPick?: { destination: string; minutes: number | null } | null;
  onUsualPickDone?: () => void;
}

const CUSTOM_HOURS = Array.from({ length: MAX_TRIP_MINUTES / 60 + 1 }, (_, h) => h);
// Every minute, so a 7-minute trip or "2 hours 10 minutes" can be said exactly (testers asked on 13 and 28 October)
const CUSTOM_MINUTES = Array.from({ length: 60 }, (_, minute) => minute);

const inputClass =
  'w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 ' +
  'text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
const labelClass = 'block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2';
const errorClass = 'text-sm font-medium text-slate-900 dark:text-white mt-1.5';

/**
 * The start of a Safe Trip: where, by when, and who is told if you don't arrive.
 */
export function StartTripForm({
  contacts,
  alertName,
  alertNameSaved,
  processing,
  onStart,
  newContactName,
  newContactPhone,
  onNewContactNameChange,
  onNewContactPhoneChange,
  onAddContact,
  onPickFromPhone,
  onManageContacts,
  usualTrips = [],
  usualPick = null,
  onUsualPickDone,
}: StartTripFormProps) {
  const [destination, setDestination] = useState('');
  // "Set it on the map": optional, alongside the typed destination
  const [destinationPoint, setDestinationPoint] = useState<Point | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  // The name the pin put in the box, if any, and whether one is being looked up
  const [pinName, setPinName] = useState<string | null>(null);
  const [namingPin, setNamingPin] = useState(false);
  // Only the latest pin's answer counts
  const namingFor = useRef<Point | null>(null);
  // Google's place search (build 27, lib/placeSearch.ts): only with Google's maps, and only while the
  // traveller is typing. searchName is the name a chosen place put in the box.
  const [searching, setSearching] = useState(false);
  const [searchName, setSearchName] = useState<string | null>(null);
  const { selectedState } = useSelectedState();
  const stateCentre = selectedState ? STATE_CENTERS[selectedState as NigerianState] : null;
  const searchNear = stateCentre ? { lat: stateCentre.lat, lng: stateCentre.lng } : null;

  // A new pin fills the box with the spot's street and area, unless the
  // traveller has typed something there themselves
  const nameThePin = async (point: Point) => {
    if (!mayFillDestination(destination, pinName)) return;
    namingFor.current = point;
    setNamingPin(true);
    const name = await askPlaceName(point);
    if (namingFor.current !== point) return;
    setNamingPin(false);
    if (!name) return;
    setDestination((current) => (mayFillDestination(current, pinName) ? name : current));
    setPinName(name);
  };
  const [durationMinutes, setDurationMinutes] = useState<number>(DEFAULT_TRIP_MINUTES);
  const [customOpen, setCustomOpen] = useState(false);
  // Starts on last time's answer, so most trips need no tap here at all
  const [travelMode, setTravelMode] = useState<TravelMode | null>(() => lastTravelMode());
  // How they are travelling and the vehicle: optional, so kept out of the way.
  // The last answer is still used, and shown on the folded row
  const [moreOpen, setMoreOpen] = useState(false);
  // Optional and folded away: most people only see the plate once they board
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const vehicle = travelMode === 'foot' ? null : readVehicle(plate, vehicleDetails);
  // The weather here for as long as the trip is planned to take
  const weather = useWeatherAhead(true, hoursToLookAhead(durationMinutes));
  // Directions (Beta, build 25): the route to the pin, and a trip length from it
  const directionsOn = useAppConfig()?.directions === true;
  const routePreview = useRoutePreview(directionsOn, destinationPoint, travelMode);
  // Not when a usual trip to the same place takes far less time (build 27)
  const route = routePreview.state === 'found' && !routeCannotBeRight(routePreview.route, null, destinationPoint, usualTrips)
    ? routePreview.route
    : null;
  // Contacts are selected unless switched off, so one added a moment ago is included
  const [deselectedIds, setDeselectedIds] = useState<string[]>([]);
  const [name, setName] = useState(alertName);
  const [nameEdited, setNameEdited] = useState(false);
  const [editingName, setEditingName] = useState(false);
  // null until the traveller ticks or unticks the box; until then it follows the trip length
  const [textContactsChoice, setTextContactsChoice] = useState<boolean | null>(null);
  // Off unless ticked: it costs a text per contact on every trip
  const [textOnArrival, setTextOnArrival] = useState(false);
  // Remembers how many contacts there were when "add another" was tapped, so
  // the small form closes by itself once the new contact has been saved
  const [addOpenAtCount, setAddOpenAtCount] = useState<number | null>(null);
  // Problems are shown once the user has tried to start, then kept up to date as they fix them
  const [submitted, setSubmitted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Keep the "arrive by" time honest while the form is open
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // The saved name arrives after the first render
  const shownName = nameEdited ? name : alertName;

  // A contact whose number cannot be texted is never one of the people told
  const selectedIds = contacts
    .filter((c) => canBeTexted(c) && !deselectedIds.includes(c.id))
    .map((c) => c.id);
  const isPreset = ARRIVAL_PRESETS.some((p) => p.minutes === durationMinutes);
  const showCustom = customOpen || !isPreset;
  const showAddForm = contacts.length === 0 || addOpenAtCount === contacts.length
    || !!newContactName || !!newContactPhone;
  const canAddMore = contacts.length < MAX_TRUSTED_CONTACTS;
  const askForName = !alertNameSaved || editingName;

  const arriveByMs = nowMs + durationMinutes * 60 * 1000;
  const textContacts = textContactsChoice ?? textContactsByDefault(durationMinutes);
  const moreLabel = moreOptionsLabel(travelMode, vehicle?.plate || null, !!vehicle);

  const plan = {
    destination: destination.trim(),
    durationMinutes,
    contactIds: selectedIds,
    alertName: shownName.trim(),
  };
  const errors: TripPlanErrors = submitted ? validateTripPlan(plan) : {};

  const toggleContact = (id: string) => {
    setDeselectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // The start buttons are at the bottom of a long form and the first question
  // is at the top. Someone who taps Start with a question unanswered sees
  // nothing happen unless the form takes them to it.
  const formRef = useRef<HTMLElement>(null);
  const [refusals, setRefusals] = useState(0);
  useEffect(() => {
    if (refusals === 0) return;
    const form = formRef.current;
    const target = form?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form?.querySelector<HTMLElement>('[role="alert"]');
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (target instanceof HTMLInputElement) target.focus({ preventScroll: true });
  }, [refusals]);

  // Repeat a usual trip (build 25): fills where, how long and how, then shows
  // the Start button with its arrival time, so nothing starts unseen
  const startRef = useRef<HTMLButtonElement>(null);
  const [chosenUsual, setChosenUsual] = useState<string | null>(null);
  const usualText = (trip: UsualTrip) => (trip.destination === 'Pin on the map' ? '' : trip.destination);
  const chooseUsualTrip = (trip: UsualTrip) => {
    namingFor.current = null;
    setNamingPin(false);
    setPinName(null);
    setSearching(false);
    setSearchName(null);
    setDestination(usualText(trip));
    setDestinationPoint(trip.point);
    setDurationMinutes(trip.minutes);
    setCustomOpen(false);
    if (isTravelMode(trip.travelMode)) setTravelMode(trip.travelMode);
    setChosenUsual(trip.key);
    setTimeout(() => startRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
  };

  // "Heading out?" tapped: the usual trip it named, chosen as if tapped here
  useEffect(() => {
    if (!usualPick) return;
    const wanted = usualPick.destination.trim().toLowerCase();
    const match = wanted ? usualTrips.find((t) => t.destination.trim().toLowerCase() === wanted) : undefined;
    const fillIn = () => {
      if (match) chooseUsualTrip(match);
      else {
        if (wanted) setDestination(usualPick.destination);
        if (usualPick.minutes) setDurationMinutes(usualPick.minutes);
      }
      onUsualPickDone?.();
    };
    if (match || usualTrips.length > 0 || !wanted) {
      fillIn();
      return;
    }
    // The usual trips may still be loading on a cold start: wait for them a moment, then fill in the words
    const wait = setTimeout(fillIn, 3000);
    return () => clearTimeout(wait);
    // Once per pick; chooseUsualTrip is redefined each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usualPick, usualTrips]);

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(validateTripPlan(plan)).length > 0) {
      setRefusals((n) => n + 1);
      return;
    }
    rememberTravelMode(travelMode);
    onStart({ ...plan, textContacts, textOnArrival, isTest: false, travelMode, vehicle, destinationPoint, route });
  };

  // A test needs everything a real trip needs except a length, which is fixed
  const handleTestTrip = () => {
    setSubmitted(true);
    const problems = validateTripPlan({ ...plan, durationMinutes: DEFAULT_TRIP_MINUTES });
    if (Object.keys(problems).length > 0) {
      setRefusals((n) => n + 1);
      return;
    }
    rememberTravelMode(travelMode);
    onStart({ ...plan, durationMinutes: TEST_TRIP_MINUTES, textContacts, textOnArrival, isTest: true, travelMode, vehicle, destinationPoint, route });
  };

  // Said again beside the buttons, where the person's thumb is
  const firstProblem = errors.destination || errors.duration || errors.contacts || errors.alertName || null;

  return (
    <section
      ref={formRef}
      aria-labelledby="start-trip-heading"
      className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-5"
    >
      <div>
        <h1 id="start-trip-heading" className="text-xl font-bold text-slate-900 dark:text-white">
          Start a safe trip
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          If you don&apos;t arrive, the people you choose get a text with your last location.
        </p>
        <WeatherLine ahead={weather} travelMode={travelMode} className="mt-3" />
      </div>

      {usualTrips.length > 0 && (
        <div>
          <p className={labelClass} id="usual-trips-label">Your usual trips</p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="usual-trips-label">
            {usualTrips.map((trip) => {
              // Not shown as chosen once they change where or how long
              const chosen = chosenUsual === trip.key && durationMinutes === trip.minutes && destination === usualText(trip);
              const mode = TRAVEL_MODES.find((m) => m.id === trip.travelMode);
              return (
                <button
                  key={trip.key}
                  type="button"
                  onClick={() => chooseUsualTrip(trip)}
                  aria-pressed={chosen}
                  className={`min-h-12 max-w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 border transition-colors ${
                    chosen
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 border-transparent text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <History className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate max-w-[13rem]">{trip.destination}</span>
                    <span className={`block text-xs ${chosen ? 'text-white/90' : 'text-slate-600 dark:text-slate-300'}`}>
                      {formatDuration(trip.minutes)}{mode ? ` · ${mode.short}` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Where */}
      <div>
        <label htmlFor="trip-destination" className={labelClass}>Where are you going?</label>
        <input
          id="trip-destination"
          type="text"
          value={destination}
          maxLength={MAX_TYPED_DESTINATION_LENGTH}
          onChange={(e) => {
            setDestination(e.target.value);
            setSearching(true);
          }}
          placeholder="Address or name of a place"
          autoComplete="off"
          aria-invalid={!!errors.destination}
          className={inputClass}
        />
        {errors.destination && <p role="alert" className={errorClass}>{errors.destination}</p>}
        {pinName !== null && destination.trim() === pinName && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Name from {PLACE_NAME_CREDIT}</p>
        )}
        {searchName !== null && destination.trim() === searchName && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Name from {PLACE_SEARCH_CREDIT}</p>
        )}
        {USES_GOOGLE_MAPS && (
          <PlaceSuggestions
            text={searching && destination.trim() !== searchName && destination.trim() !== pinName ? destination : null}
            near={searchNear}
            onChoose={(place) => {
              namingFor.current = null;
              setNamingPin(false);
              setPinName(null);
              setSearching(false);
              setSearchName(place.name);
              setDestination(place.name);
              setDestinationPoint({ lat: place.lat, lng: place.lng });
            }}
          />
        )}
        {destinationPoint ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <MapPin className="w-4 h-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            Pin set on the map
            {namingPin && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400" role="status">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                Finding its name…
              </span>
            )}
            <button type="button" onClick={() => setPinOpen(true)} className="relative after:absolute after:-inset-x-2 after:-inset-y-3.5 font-medium text-blue-600 dark:text-blue-400 hover:underline">Change</button>
            <button
              type="button"
              onClick={() => {
                namingFor.current = null;
                setNamingPin(false);
                setDestinationPoint(null);
              }}
              className="relative after:absolute after:-inset-x-2 after:-inset-y-3.5 font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Remove
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="mt-1 min-h-12 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            Set it on the map (optional)
          </button>
        )}
        {pinOpen && (
          <DestinationPinSheet
            current={destinationPoint}
            onClose={() => setPinOpen(false)}
            onDone={(point) => {
              setDestinationPoint(point);
              setPinOpen(false);
              void nameThePin(point);
            }}
          />
        )}
      </div>

      {/* When */}
      <div>
        <p className={labelClass} id="trip-duration-label">How long will it take?</p>
        <div className="grid grid-cols-5 gap-2" role="group" aria-labelledby="trip-duration-label">
          {ARRIVAL_PRESETS.map((preset) => {
            const selected = !showCustom && durationMinutes === preset.minutes;
            return (
              <button
                key={preset.minutes}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setDurationMinutes(preset.minutes);
                  setCustomOpen(false);
                }}
                className={`min-h-12 py-2.5 px-1 rounded-xl text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={showCustom}
            onClick={() => setCustomOpen(true)}
            className={`min-h-12 py-2.5 px-1 rounded-xl text-sm font-medium transition-colors ${
              showCustom
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Other
          </button>
        </div>

        {showCustom && (
          <div className="grid grid-cols-4 gap-2 mt-3" role="group" aria-label="Long trips">
            {LONG_TRIP_PRESETS.map((preset) => {
              const selected = durationMinutes === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDurationMinutes(preset.minutes)}
                  className={`min-h-12 py-2.5 px-1 rounded-xl text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        {showCustom && (
          <div className="flex items-center gap-2 mt-2">
            <label className="sr-only" htmlFor="trip-hours">Hours</label>
            <select
              id="trip-hours"
              value={Math.floor(durationMinutes / 60)}
              onChange={(e) => setDurationMinutes(Number(e.target.value) * 60 + (durationMinutes % 60))}
              className={`${inputClass} py-2.5`}
            >
              {CUSTOM_HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
            <label className="sr-only" htmlFor="trip-minutes">Minutes</label>
            <select
              id="trip-minutes"
              value={durationMinutes % 60}
              onChange={(e) => setDurationMinutes(Math.floor(durationMinutes / 60) * 60 + Number(e.target.value))}
              className={`${inputClass} py-2.5`}
            >
              {CUSTOM_MINUTES.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        )}

        {errors.duration ? (
          <p role="alert" className={errorClass}>{errors.duration}</p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            Not arrived {ALERT_GRACE_MINUTES} min after{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{formatClock(arriveByMs, nowMs)}</span>?
            {' '}Your contacts are texted.
          </p>
        )}

        {/* Directions (Beta): Mapbox's time leaves out traffic, so the length offered has a margin */}
        {routePreview.state === 'finding' && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            Finding the route by road&hellip;
          </p>
        )}
        {route && (() => {
          const suggested = suggestedTripMinutes(route.durationS);
          const margin = route.profile === 'walking' ? 'with time to spare' : 'with time for traffic';
          return (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
              <span>
                {route.profile === 'walking' ? 'On foot' : 'By road'}: about{' '}
                <span className="font-semibold">{formatDuration(Math.max(1, Math.round(route.durationS / 60)))}</span>,{' '}
                {formatDistance(route.distanceM)}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Beta</span>
              {durationMinutes === suggested ? (
                <span className="flex items-center gap-1 text-brand-700 dark:text-brand-300 font-medium">
                  <Check className="w-4 h-4" aria-hidden="true" /> Using {formatDuration(suggested)}, {margin}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDurationMinutes(suggested)}
                  className="font-semibold text-brand-700 dark:text-brand-300 underline underline-offset-2"
                >
                  Use {formatDuration(suggested)}, {margin}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Who */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" id="trip-contacts-label">
            Who should be told?
          </p>
          {contacts.length > 0 && (
            <button
              type="button"
              onClick={onManageContacts}
              className="relative after:absolute after:-inset-x-2 after:-inset-y-3.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </button>
          )}
        </div>

        {contacts.length > 0 && (
          <ul className="space-y-2" aria-labelledby="trip-contacts-label">
            {contacts.map((contact) => {
              if (!canBeTexted(contact)) {
                return (
                  <li
                    key={contact.id}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-slate-300 bg-slate-100 dark:bg-slate-700 dark:border-slate-600"
                  >
                    <span
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100 flex items-center justify-center flex-shrink-0"
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900 dark:text-white truncate">{contact.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{contact.phone || 'No number saved'}</span>
                      {askedForNoTexts(contact) ? (
                        <span className="block text-sm text-slate-900 dark:text-slate-100 mt-1">
                          {contact.name} asked WakaGuard not to text their number, so they will not be told.
                          Only they can turn texts back on, from the link in an earlier WakaGuard text.
                        </span>
                      ) : (
                        <span className="block text-sm text-slate-900 dark:text-slate-100 mt-1">
                          This number cannot be texted, so {contact.name} will not be told.{' '}
                          <button type="button" onClick={onManageContacts} className="font-semibold underline">
                            Fix it
                          </button>
                        </span>
                      )}
                    </span>
                  </li>
                );
              }
              const checked = selectedIds.includes(contact.id);
              return (
                <li key={contact.id}>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                      checked
                        ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/40 dark:border-brand-700'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleContact(contact.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100 flex items-center justify-center text-sm font-bold flex-shrink-0"
                    >
                      {initialsOf(contact.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900 dark:text-white truncate">{contact.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{contact.phoneE164 || contact.phone}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-500'
                      }`}
                    >
                      {checked && <Check className="w-4 h-4 text-white" />}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {showAddForm && canAddMore && (
          <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            {contacts.length === 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Add someone who would notice if you didn&apos;t arrive.
              </p>
            )}
            <label className="sr-only" htmlFor="trip-contact-name">Contact name</label>
            <input
              id="trip-contact-name"
              type="text"
              value={newContactName}
              onChange={(e) => onNewContactNameChange(e.target.value)}
              placeholder="Name"
              autoComplete="off"
              className={`${inputClass} py-2.5 text-sm`}
            />
            <label className="sr-only" htmlFor="trip-contact-phone">Contact phone number</label>
            <input
              id="trip-contact-phone"
              type="tel"
              value={newContactPhone}
              onChange={(e) => onNewContactPhoneChange(e.target.value)}
              placeholder="Their phone number"
              autoComplete="off"
              className={`${inputClass} py-2.5 text-sm`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAddContact}
                disabled={processing}
                className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add contact
              </button>
              <button
                type="button"
                onClick={onPickFromPhone}
                disabled={processing}
                className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                From phone
              </button>
            </div>
          </div>
        )}

        {!showAddForm && canAddMore && (
          <button
            type="button"
            onClick={() => setAddOpenAtCount(contacts.length)}
            className="mt-2 w-full min-h-12 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add another person
          </button>
        )}

        {errors.contacts && <p role="alert" className={errorClass}>{errors.contacts}</p>}

        {contacts.length > 0 && (
          <label className="flex items-center gap-3 mt-1 min-h-12 cursor-pointer">
            <input
              type="checkbox"
              checked={textContacts}
              onChange={(e) => setTextContactsChoice(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 accent-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">Text them the trip link when I start</span>
          </label>
        )}
        {contacts.length > 0 && (
          <label className="flex items-start gap-3 mt-1 py-1.5 min-h-12 cursor-pointer">
            <input
              type="checkbox"
              checked={textOnArrival}
              onChange={(e) => setTextOnArrival(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-slate-300 accent-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Text them when I arrive
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                One text to each of them when you tap &quot;I&apos;ve arrived&quot;
              </span>
            </span>
          </label>
        )}
      </div>

      {/* Never asked for: a trip starts the same with or without these */}
      <div>
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(!moreOpen)}
          className="w-full min-h-12 flex items-center justify-between gap-2 text-left text-sm font-semibold text-slate-800 dark:text-slate-100"
        >
          <span>
            {moreLabel}
            <span className="sr-only"> (more options: how you are travelling, and the vehicle)</span>
          </span>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${moreOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {moreOpen && (
          <div className="mt-2">
            <p className={labelClass} id="trip-travel-label">
              How are you travelling? <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
            </p>
            <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="trip-travel-label">
              {TRAVEL_MODES.map((mode) => {
                const selected = travelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={mode.label}
                    onClick={() => setTravelMode(selected ? null : mode.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl px-1 pt-2 pb-1.5 border-2 transition-colors ${
                      selected
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/40'
                        : 'border-transparent bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <TravelPicture mode={mode.id} size={36} />
                    <span className={`text-xs font-medium leading-tight text-center ${
                      selected ? 'text-brand-800 dark:text-brand-100' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {mode.short}
                    </span>
                  </button>
                );
              })}
            </div>
            {tipBeforeSettingOff(travelMode) && (
              <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 mt-2" aria-live="polite">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                {tipBeforeSettingOff(travelMode)}
              </p>
            )}
            {travelMode !== 'foot' && (
              vehicleOpen ? (
                <div className="mt-3">
                  <VehicleFields plate={plate} details={vehicleDetails} onPlate={setPlate} onDetails={setVehicleDetails} idPrefix="start-vehicle" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setVehicleOpen(true)}
                  className="mt-1 min-h-12 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add plate number or driver (optional)
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Name shown to contacts */}
      <div>
        {askForName ? (
          <>
            <label htmlFor="trip-alert-name" className={labelClass}>Your name, as they know you</label>
            <input
              id="trip-alert-name"
              type="text"
              value={shownName}
              maxLength={MAX_ALERT_NAME_LENGTH}
              onChange={(e) => {
                setName(e.target.value);
                setNameEdited(true);
              }}
              placeholder="Ada"
              autoComplete="name"
              aria-invalid={!!errors.alertName}
              className={inputClass}
            />
            {errors.alertName ? (
              <p role="alert" className={errorClass}>{errors.alertName}</p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Texts to your contacts start with this name, so they know who it is about.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your contacts will see you as{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{shownName}</span>.{' '}
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="relative after:absolute after:-inset-x-2 after:-inset-y-3.5 font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change
            </button>
          </p>
        )}
      </div>

      {firstProblem && (
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 text-center">
          {firstProblem} to start the trip.
        </p>
      )}

      <button
        ref={startRef}
        type="button"
        onClick={handleSubmit}
        disabled={processing}
        className="w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
        <span className="text-left leading-tight">
          <span className="block">Start safe trip</span>
          {/* The length is on the button so a trip of the wrong length is noticed before it starts */}
          {!errors.duration && (
            <span className="block text-sm font-medium opacity-90">
              {formatDuration(durationMinutes)}, arrive by {formatClock(arriveByMs, nowMs)}
            </span>
          )}
        </span>
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleTestTrip}
          disabled={processing}
          className="w-full py-3 rounded-2xl text-base font-semibold border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Try a {TEST_TRIP_MINUTES}-minute test trip instead
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          If you don&apos;t end it, contacts get a text marked TEST.
        </p>
      </div>
    </section>
  );
}
