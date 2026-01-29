'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  MapPin, AlertTriangle, Users, Shield, ChevronRight, ChevronLeft, X,
  Navigation, Phone, Clock, Bell, Camera, ThumbsUp, Car, Heart, FileText
} from 'lucide-react';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

// Condensed slides for quicker onboarding (5 slides instead of 9)
const slides = [
  {
    icon: MapPin,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Welcome to WakaGuard',
    description: 'Your community-driven road safety companion for Nigeria. Report hazards, get real-time alerts, and help make our roads safer.',
    tips: null,
  },
  {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Report & View Hazards',
    description: 'See road hazards on the map and report new ones instantly. Add photos and set severity to warn other drivers.',
    tips: [
      'Tap + to report potholes, accidents, traffic',
      'Tap map markers to view details',
      'Vote to confirm if hazards are still there',
    ],
  },
  {
    icon: Shield,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    title: 'Stay Safe on Every Trip',
    description: 'Built-in safety tools for peace of mind on Nigerian roads.',
    tips: [
      'Emergency SOS - Call 112 instantly',
      'Share Trip - Let contacts track you live',
      'Safety Timer - Get check-in reminders',
    ],
  },
  {
    icon: Phone,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    title: 'Emergency Numbers',
    description: 'Quick access to Nigerian emergency services when you need them.',
    tips: [
      '112 - General Emergency',
      '122 - FRSC (Road Safety)',
      '199 - Police',
    ],
  },
  {
    icon: Bell,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Stay Updated',
    description: 'Enable push notifications to get alerts about road hazards near you in real-time.',
    tips: [
      'Get notified of new hazards on your route',
      'Receive checkpoint alerts nearby',
      'Stay informed about road conditions',
    ],
  },
  {
    icon: ThumbsUp,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'You\'re Ready!',
    description: 'Help build a safer road community. Report hazards responsibly, verify reports when passing by, and drive safe!',
    tips: [
      'Don\'t report while driving',
      'Be accurate with locations',
      'Upvote helpful reports',
    ],
  },
];

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('wakaguard_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4 overflow-y-auto">
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Slide counter */}
      <div className="absolute top-4 left-4 text-white/60 text-sm font-medium">
        {currentSlide + 1} / {slides.length}
      </div>

      <div className="w-full max-w-md my-auto py-8">
        {/* Slide content */}
        <div className="text-center mb-6">
          {/* Icon or Logo */}
          {currentSlide === 0 ? (
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Image 
                src="/icons/icon-96x96.png" 
                alt="WakaGuard" 
                width={72} 
                height={72}
                className="rounded-lg"
              />
            </div>
          ) : (
            <div className={`w-20 h-20 ${slide.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}>
              <Icon className={`w-10 h-10 ${slide.iconColor}`} />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-3">{slide.title}</h1>

          {/* Description */}
          <p className="text-base text-white/80 leading-relaxed">{slide.description}</p>
        </div>

        {/* Tips section */}
        {slide.tips && slide.tips.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
            <ul className="space-y-2">
              {slide.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-white/90 text-sm">
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {index + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-white w-8'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              currentSlide === 0
                ? 'opacity-0 pointer-events-none'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
          >
            {isLastSlide ? 'Get Started' : 'Next'}
            {!isLastSlide && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Skip text */}
        {!isLastSlide && (
          <button
            onClick={handleSkip}
            className="w-full mt-4 text-white/60 hover:text-white text-sm transition-colors"
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}

export function useOnboardingStatus() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('wakaguard_onboarding_complete');
      setShowOnboarding(!completed);
      setChecked(true);
    }
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding, checked };
}
