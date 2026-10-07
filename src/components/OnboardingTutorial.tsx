'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, MapPin, Phone, Users } from 'lucide-react';
import { ALERT_GRACE_MINUTES } from '@/lib/tripPlanning';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: null,
    tint: '',
    title: 'Get there safely',
    description: 'Before you set off, tell WakaGuard where you are going and when you should arrive.',
    points: null,
  },
  {
    icon: Users,
    tint: 'bg-brand-100 text-brand-700',
    title: "If you don't arrive, your people are told",
    description: `If your trip is still running ${ALERT_GRACE_MINUTES} minutes after your arrival time, the contacts you chose get a text with your last location.`,
    points: [
      'It works even if your phone is off or has no signal',
      "Tap “I've arrived” and nothing is sent",
      'Running late? Add time on the way',
    ],
  },
  {
    icon: Phone,
    tint: 'bg-red-100 text-red-700',
    title: 'Help in one tap',
    description: 'Emergency SOS calls 112 and texts your contacts where you are.',
    points: ['If a call is not safe, you can alert them by text only'],
  },
  {
    icon: MapPin,
    tint: 'bg-blue-100 text-blue-700',
    title: 'See what is reported nearby',
    description: 'Other travellers report accidents, floods and bad roads around you.',
    points: ['Reports are a guide only. No report does not mean a road is safe'],
  },
];

/** The first thing a new user sees: what the app does, in four short screens. */
export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleComplete = () => {
    localStorage.setItem('wakaguard_onboarding_complete', 'true');
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
      <div className="flex justify-end p-4">
        <button
          onClick={handleComplete}
          className={`px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white ${isLastSlide ? 'invisible' : ''}`}
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center w-full max-w-md mx-auto">
        {Icon ? (
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 ${slide.tint}`}>
            <Icon className="w-11 h-11" aria-hidden="true" />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-3xl bg-brand-50 dark:bg-slate-800 flex items-center justify-center mb-8">
            <Image src="/icons/icon-96x96.png" alt="WakaGuard" width={64} height={64} className="rounded-xl" />
          </div>
        )}

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{slide.title}</h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">{slide.description}</p>

        {slide.points && (
          <ul className="mt-6 w-full space-y-2 text-left">
            {slide.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
              >
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-brand-600 flex-shrink-0" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-6 pb-8 pt-6 w-full max-w-md mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
        <div className="flex items-center justify-center gap-2 mb-6" aria-hidden="true">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'w-8 bg-brand-600' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {currentSlide > 0 && (
            <button
              onClick={() => setCurrentSlide(currentSlide - 1)}
              className="px-5 py-4 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              Back
            </button>
          )}
          <button
            onClick={() => (isLastSlide ? handleComplete() : setCurrentSlide(currentSlide + 1))}
            className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-1"
          >
            {isLastSlide ? 'Get started' : 'Next'}
            {!isLastSlide && <ChevronRight className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
