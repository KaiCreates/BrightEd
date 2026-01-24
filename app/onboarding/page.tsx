'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system'
import { useAuth } from '@/lib/auth-context'

interface OnboardingData {
  firstName: string
  lastName: string
  country: string
  school: string
  examTrack: 'CSEC' | 'CAPE' | ''
  currentForm: string
  subjects: string[]
  learningGoal: string
  intent: 'learner' | 'owner' | 'both'
  skills: {
    finance: number
    logic: number
    math: number
  }
}

const countries = ['Trinidad and Tobago', 'Jamaica', 'Barbados', 'Guyana', 'Other']
const forms = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6']
const subjects = [
  'Mathematics',
  'English A',
  'Principles of Business',
  'Integrated Science',
  'Economics',
  'Geography',
  'Information Technology',
]
const learningGoals = [
  'Improve understanding',
  'Prepare for exams',
  'Catch up on weak areas',
  'Stay consistent',
]

/**
 * OnboardingPage
 * Redesigned for high engagement and deep signal collection.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    country: '',
    school: '',
    examTrack: '',
    currentForm: '',
    subjects: [],
    learningGoal: '',
    intent: 'learner',
    skills: {
      finance: 3,
      logic: 3,
      math: 3,
    }
  })

  // Auto-fill from Firestore
  useEffect(() => {
    const fillData = async () => {
      const { auth, db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setData(prev => ({
            ...prev,
            firstName: userData.firstName || prev.firstName,
            lastName: userData.lastName || prev.lastName,
            // Fill other fields if they exist in DB schema, for now mostly names are stored
          }));
        }
      }
    };
    fillData();
  }, []);

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (step < 9) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    try {
      // Save onboarding data to Firestore instead of localStorage
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          onboardingData: data,
          onboardingCompleted: true,
          updatedAt: new Date().toISOString()
        })
      }
      
      router.push('/onboarding/diagnostic')
    } catch (error) {
      console.error('Error saving onboarding data:', error)
      // Fallback to localStorage for now, but this should be removed
      localStorage.setItem('brighted_onboarding', JSON.stringify(data))
      router.push('/onboarding/diagnostic')
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[var(--brand-primary)] opacity-5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-[var(--brand-secondary)] opacity-5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 && <WelcomeScreen key="1" onNext={nextStep} />}
          {step === 2 && (
            <IntentScreen
              key="2"
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {step === 3 && (
            <IdentityScreen
              key="3"
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {step === 4 && (
            <AcademicContextScreen
              key="4"
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {step === 5 && (
            <SkillAssessmentScreen
              key="5"
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {step === 6 && (
            <CurrentLevelScreen
              key="6"
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {step === 7 && (
            <SubjectSelectionScreen
              key="7"
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {step === 8 && (
            <LearningGoalScreen
              key="8"
              data={data}
              updateData={updateData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          )}
          {step === 9 && (
            <DiagnosticSetupScreen
              key="9"
              onNext={handleComplete}
              onPrev={prevStep}
            />
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
              <motion.div
                key={s}
                animate={{
                  scale: s === step ? 1.2 : 1,
                  backgroundColor: s <= step ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                }}
                className="h-1 w-8 rounded-full"
              />
            ))}
          </div>
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">
            Step {step} of 9
          </p>
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
    >
      <BrightLayer variant="glass" padding="lg" className="text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]" />

        <div className="mb-8 flex justify-center">
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-32 h-32 p-4 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-subtle)]"
          >
            <Image
              src="/BrightEdLogo.png"
              alt="BrightEd Logo"
              fill
              className="object-contain p-4"
            />
          </motion.div>
        </div>
        <BrightHeading level={1} className="mb-6">
          Master Your <span className="text-[var(--brand-primary)]">Future.</span>
        </BrightHeading>
        <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-md mx-auto leading-relaxed font-medium">
          The only learning platform that adapts to your unique business goals and knowledge level.
        </p>
        <BrightButton onClick={onNext} size="lg">
          Start Your Journey
        </BrightButton>
      </BrightLayer>
    </motion.div>
  )
}

function IntentScreen({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  const options = [
    {
      id: 'learner',
      title: 'I want to Learn',
      desc: 'Build a strong foundation in business and financials.',
      icon: '📚'
    },
    {
      id: 'owner',
      title: 'I want to Build',
      desc: 'Create, manage, and scale your own virtual business.',
      icon: '🚀'
    },
    {
      id: 'both',
      title: 'I want Both',
      desc: 'Learn the theory and apply it to a real venture.',
      icon: '💎'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightLayer variant="elevated" padding="md">
        <BrightHeading level={2} className="mb-2">What&apos;s your primary goal?</BrightHeading>
        <p className="text-[var(--text-secondary)] mb-8 font-medium">We&apos;ll tailor your path based on your ambition.</p>

        <div className="space-y-4 mb-10">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => updateData('intent', opt.id)}
              className={`w-full text-left p-6 rounded-3xl border transition-all duration-300 group flex items-center gap-6 ${data.intent === opt.id
                ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50'
                }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${data.intent === opt.id ? 'bg-white/20' : 'bg-[var(--bg-primary)]'
                }`}>
                {opt.icon}
              </div>
              <div>
                <div className="text-xl font-black mb-1 leading-tight">{opt.title}</div>
                <div className={`text-sm font-medium ${data.intent === opt.id ? 'text-white/70' : 'text-[var(--text-muted)]'
                  }`}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <BrightButton variant="ghost" onClick={onPrev} size="sm">
            Back
          </BrightButton>
          <BrightButton onClick={onNext}>
            Continue
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}

function SkillAssessmentScreen({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  const updateSkill = (skill: keyof OnboardingData['skills'], val: number) => {
    updateData('skills', { ...data.skills, [skill]: val })
  }

  const skills = [
    { id: 'finance', title: 'Financial Literacy', icon: '💰', desc: 'Money management, accounting, investing.' },
    { id: 'logic', title: 'Logical Reasoning', icon: '🧩', desc: 'Strategy, problem solving, analysis.' },
    { id: 'math', title: 'Mathematics', icon: '🔢', desc: 'Calculations, data interpretation.' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightLayer variant="elevated" padding="md">
        <BrightHeading level={2} className="mb-2">Self-Assessment</BrightHeading>
        <p className="text-[var(--text-secondary)] mb-8 font-medium">Be honest! We use this to set your starting difficulty.</p>

        <div className="space-y-8 mb-10">
          {skills.map((s) => (
            <div key={s.id}>
              <div className="flex justify-between items-end mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-lg font-black text-[var(--text-primary)]">{s.title}</span>
                </div>
                <span className="text-[var(--brand-primary)] font-black text-sm uppercase tracking-tighter">
                  Level {data.skills[s.id as keyof OnboardingData['skills']]} / 5
                </span>
              </div>
              <div className="relative h-4 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border-subtle)] flex gap-1 p-1">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => updateSkill(s.id as keyof OnboardingData['skills'], val)}
                    className={`flex-1 h-full rounded-full transition-all duration-300 ${val <= data.skills[s.id as keyof OnboardingData['skills']]
                      ? 'bg-[var(--brand-primary)] shadow-[0_0_10px_var(--brand-primary)]/30'
                      : 'bg-transparent hover:bg-[var(--bg-primary)]'
                      }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)] font-medium italic">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <BrightButton variant="ghost" onClick={onPrev} size="sm">
            Back
          </BrightButton>
          <BrightButton onClick={onNext}>
            Confirm Levels
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}

function IdentityScreen({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightLayer variant="elevated" padding="md">
        <BrightHeading level={2} className="mb-8 leading-tight">
          Personal Details
        </BrightHeading>
        <div className="space-y-6 mb-10">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
              First Name
            </label>
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => updateData('firstName', e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-6 py-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] font-bold"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
              Last Name (optional)
            </label>
            <input
              type="text"
              value={data.lastName}
              onChange={(e) => updateData('lastName', e.target.value)}
              placeholder="e.g. Smith"
              className="w-full px-6 py-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] font-bold"
            />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <BrightButton variant="ghost" onClick={onPrev} size="sm">
            Back
          </BrightButton>
          <BrightButton
            onClick={onNext}
            disabled={!data.firstName}
          >
            Next Step
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}

function AcademicContextScreen({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightLayer variant="elevated" padding="md">
        <BrightHeading level={2} className="mb-2">School & Region</BrightHeading>
        <p className="text-[var(--text-secondary)] mb-8 font-medium">This helps us localize your exam targets.</p>

        <div className="space-y-6 mb-10">
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">Country</label>
            <select
              value={data.country}
              onChange={(e) => updateData('country', e.target.value)}
              className="w-full px-6 py-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-primary)] text-[var(--text-primary)] outline-none appearance-none font-bold cursor-pointer"
              required
            >
              <option value="" className="bg-[var(--bg-elevated)]">Select Your Country</option>
              {countries.map((country) => (
                <option key={country} value={country} className="bg-[var(--bg-elevated)]">
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">School</label>
            <input
              type="text"
              value={data.school}
              onChange={(e) => updateData('school', e.target.value)}
              placeholder="Your School Name"
              className="w-full px-6 py-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-primary)] text-[var(--text-primary)] outline-none font-bold"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">Exam Track</label>
            <div className="flex gap-4">
              {['CSEC', 'CAPE'].map((track) => (
                <button
                  key={track}
                  type="button"
                  onClick={() => updateData('examTrack', track)}
                  className={`flex-1 py-4 rounded-2xl font-black transition-all border ${data.examTrack === track
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50'
                    }`}
                >
                  {track}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <BrightButton variant="ghost" onClick={onPrev} size="sm">
            Back
          </BrightButton>
          <BrightButton
            onClick={onNext}
            disabled={!data.country || !data.school || !data.examTrack}
          >
            Continue
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}

function CurrentLevelScreen({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightLayer variant="elevated" padding="md">
        <BrightHeading level={2} className="mb-2">Academic Level</BrightHeading>
        <p className="text-[var(--text-secondary)] mb-8 font-medium">Pick your current grade level.</p>

        <div className="grid grid-cols-2 gap-3 mb-10">
          {forms.map((form) => (
            <button
              key={form}
              type="button"
              onClick={() => updateData('currentForm', form)}
              className={`px-4 py-4 rounded-2xl font-black text-center transition-all border ${data.currentForm === form
                ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50'
                }`}
            >
              {form}
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <BrightButton variant="ghost" onClick={onPrev} size="sm">
            Back
          </BrightButton>
          <BrightButton
            onClick={onNext}
            disabled={!data.currentForm}
          >
            Next
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}

function SubjectSelectionScreen({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  const toggleSubject = (subject: string) => {
    const current = data.subjects
    if (current.includes(subject)) {
      updateData('subjects', current.filter((s) => s !== subject))
    } else {
      updateData('subjects', [...current, subject])
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightLayer variant="elevated" padding="md">
        <BrightHeading level={2} className="mb-2">Your Subjects</BrightHeading>
        <p className="text-[var(--text-secondary)] mb-8 font-medium">Which ones are you focused on today?</p>

        <div className="grid grid-cols-2 gap-3 mb-10">
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => toggleSubject(subject)}
              className={`px-4 py-4 rounded-2xl font-bold text-sm transition-all border ${data.subjects.includes(subject)
                ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50'
                }`}
            >
              {subject}
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <BrightButton variant="ghost" onClick={onPrev} size="sm">
            Back
          </BrightButton>
          <BrightButton
            onClick={onNext}
            disabled={data.subjects.length === 0}
          >
            Continue
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}

function LearningGoalScreen({
  data,
  updateData,
  onNext,
  onPrev,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightLayer variant="elevated" padding="md">
        <BrightHeading level={2} className="mb-2">Your Target</BrightHeading>
        <p className="text-[var(--text-secondary)] mb-8 font-medium">Where do you want to be in 3 months?</p>

        <div className="space-y-4 mb-10">
          {learningGoals.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => updateData('learningGoal', goal)}
              className={`w-full text-left px-6 py-5 rounded-2xl font-bold transition-all border ${data.learningGoal === goal
                ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-lg'
                : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50'
                }`}
            >
              {goal}
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <BrightButton variant="ghost" onClick={onPrev} size="sm">
            Back
          </BrightButton>
          <BrightButton
            onClick={onNext}
            disabled={!data.learningGoal}
          >
            Check-in
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}

function DiagnosticSetupScreen({
  onNext,
  onPrev,
}: {
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
    >
      <BrightLayer variant="glass" padding="lg" className="text-center">
        <div className="mb-8 text-6xl">🧠</div>
        <BrightHeading level={2} className="mb-6 leading-tight">
          One Last Thing.
        </BrightHeading>
        <div className="space-y-6 mb-10">
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed font-medium">
            To truly personalize your path, we need to see how you think.
          </p>
          <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 p-6 rounded-3xl text-left">
            <p className="text-[var(--brand-primary)] font-black uppercase tracking-[0.2em] text-[10px] mb-3 inline-block">Diagnostic Phase</p>
            <ul className="space-y-3 text-[var(--text-secondary)] font-bold text-sm">
              <li className="flex items-center gap-2">✅ No Grades or Rankings</li>
              <li className="flex items-center gap-2">✅ Measures Logic & Speed</li>
              <li className="flex items-center gap-2">✅ Sets Your &quot;Baseline&quot;</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-4">
          <BrightButton variant="secondary" onClick={onPrev} className="flex-1">
            Revise
          </BrightButton>
          <BrightButton
            onClick={onNext}
            className="flex-[2]"
          >
            Start Evaluation
          </BrightButton>
        </div>
      </BrightLayer>
    </motion.div>
  )
}
