'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import schoolsData from '@/data/schools.json'

interface OnboardingData {
  firstName: string
  lastName: string
  country: string
  school: string
  examTrack: 'CSEC' | 'CAPE' | 'Tertiary' | ''
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
const forms = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6', "University"]
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
    if (step < 9) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleComplete = async () => {
    try {
      const { doc, updateDoc, collection, getDocs, limit, query, writeBatch } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      const { toast } = await import('react-hot-toast')

      if (!user) {
        toast.error("You must be logged in to complete onboarding.")
        return
      }

      localStorage.setItem('onboarding_status', 'in_progress')
      localStorage.setItem('brighted_onboarding_complete', 'true')
      sessionStorage.removeItem('redirect_target')

      const userRef = doc(db, 'users', user.uid)
      const formLevel = parseInt((data.currentForm || '').replace('Form ', '') || '3')
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim()
      const schoolName = (data.school || '').trim()
      const schoolId = schoolName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 64)

      const subjectProgress: Record<string, number> = {}
        ; (data.subjects || []).forEach((subject: string) => {
          subjectProgress[subject] = 0
        })

      await updateDoc(userRef, {
        onboardingData: data,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        fullName,
        school: schoolName,
        schoolId,
        schoolLocked: true,
        country: data.country || '',
        examTrack: data.examTrack || 'CSEC',
        formLevel,
        form: formLevel,
        subjects: data.subjects || [],
        subjectProgress,
        learningGoal: data.learningGoal || '',
        intent: data.intent || 'learner',
        skills: data.skills || { finance: 3, logic: 3, math: 3 },
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      if ((data.subjects || []).length > 0) {
        const progressRef = collection(userRef, 'progress')
        const existing = await getDocs(query(progressRef, limit(1)))

        if (existing.empty) {
          const { paths } = await fetch(
            '/api/learning-path?' +
            new URLSearchParams({
              subjects: (data.subjects || []).join(','),
            })
          ).then((res) => res.json())

          if (paths) {
            const batch = writeBatch(db)
            let isFirstModule = true

            for (const [subject, objectives] of Object.entries(paths)) {
              const objectivesList = objectives as any[]
              for (const obj of objectivesList) {
                const moduleRef = doc(progressRef, obj.id)
                batch.set(moduleRef, {
                  moduleId: obj.id,
                  subject,
                  isUnlocked: isFirstModule,
                  status: isFirstModule ? 'active' : 'locked',
                  mastery: 0,
                  attempts: 0,
                })
                if (isFirstModule) isFirstModule = false
              }
            }
            await batch.commit()
          }
        }
      }

      if (fullName) {
        const { auth } = await import('@/lib/firebase')
        const { updateProfile } = await import('firebase/auth')
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: fullName })
        }
      }

      toast.success('Profile saved! Starting diagnostic...')
      router.push('/onboarding/diagnostic')
    } catch (error) {
      console.error('Error saving onboarding data:', error)
      const { toast } = await import('react-hot-toast')
      toast.error('Failed to save profile. Please check your connection.')
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col safe-padding">
      {/* Duolingo-style Header */}
      <header className="w-full max-w-5xl mx-auto px-4 py-8 flex items-center gap-6">
        <button
          onClick={prevStep}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-2xl p-2"
          disabled={step === 1}
        >
          {step === 1 ? '✕' : '←'}
        </button>

        <div className="flex-1 duo-progress-bar bg-gray-200">
          <motion.div
            className="duo-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 9) * 100}%` }}
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {step === 1 && <WelcomeScreen key="1" onNext={nextStep} />}
            {step === 2 && (
              <IntentScreen
                key="2"
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 3 && (
              <IdentityScreen
                key="3"
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 4 && (
              <AcademicContextScreen
                key="4"
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 5 && (
              <SkillAssessmentScreen
                key="5"
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 6 && (
              <CurrentLevelScreen
                key="6"
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 7 && (
              <SubjectSelectionScreen
                key="7"
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 8 && (
              <LearningGoalScreen
                key="8"
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}
            {step === 9 && (
              <DiagnosticSetupScreen
                key="9"
                onNext={handleComplete}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="text-center"
    >
      <div className="mb-8 flex justify-center">
        <motion.div
          animate={{
            y: [0, -20, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-48 h-48 drop-shadow-2xl"
        >
          <Image
            src="/BrightEdLogo.png"
            alt="BrightEd Logo"
            fill
            className="object-contain"
          />
        </motion.div>
      </div>

      <BrightHeading level={1} className="mb-6 duo-text-primary text-5xl">
        Master Your <span className="text-[var(--brand-primary)]">Future.</span>
      </BrightHeading>

      <p className="text-xl text-[var(--text-secondary)] mb-12 max-w-md mx-auto leading-relaxed font-bold">
        Join 5,000+ students building real businesses while mastering their exams.
      </p>

      <button
        onClick={onNext}
        className="duo-btn duo-btn-primary w-full max-w-sm text-lg py-5"
      >
        Get Started
      </button>
    </motion.div>
  )
}

function IntentScreen({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
}) {
  const options = [
    {
      id: 'learner',
      title: 'LEARN',
      desc: 'Build a strong foundation.',
      icon: '📚'
    },
    {
      id: 'owner',
      title: 'BUILD',
      desc: 'Create your virtual business.',
      icon: '🚀'
    },
    {
      id: 'both',
      title: 'MASTER BOTH',
      desc: 'The complete experience.',
      icon: '💎'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col h-full"
    >
      <BrightHeading level={2} className="mb-8 text-center">What&apos;s your goal?</BrightHeading>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => updateData('intent', opt.id)}
            className={`duo-card flex items-center gap-6 text-left ${data.intent === opt.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : ''
              }`}
          >
            <div className="text-4xl">{opt.icon}</div>
            <div>
              <div className="text-lg font-black">{opt.title}</div>
              <div className="text-sm text-[var(--text-secondary)] font-bold">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="duo-btn duo-btn-primary w-full py-5"
      >
        Continue
      </button>
    </motion.div>
  )
}

function SkillAssessmentScreen({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
}) {
  const updateSkill = (skill: keyof OnboardingData['skills'], val: number) => {
    updateData('skills', { ...data.skills, [skill]: val })
  }

  const skills = [
    { id: 'finance', title: 'Financial Literacy', icon: '💰', desc: 'Money, accounting, investing.' },
    { id: 'logic', title: 'Logical Reasoning', icon: '🧩', desc: 'Strategy and analysis.' },
    { id: 'math', title: 'Mathematics', icon: '🔢', desc: 'Calculations and data.' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightHeading level={2} className="mb-8 text-center">Self-Assessment</BrightHeading>

      <div className="space-y-8 mb-12">
        {skills.map((s) => (
          <div key={s.id} className="duo-card border-none bg-gray-50 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-lg font-black">{s.title}</span>
              </div>
              <span className="text-[var(--brand-primary)] font-black">Level {data.skills[s.id as keyof OnboardingData['skills']]} / 5</span>
            </div>

            <div className="flex gap-2 h-3">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => updateSkill(s.id as keyof OnboardingData['skills'], val)}
                  className={`flex-1 rounded-full transition-all ${val <= data.skills[s.id as keyof OnboardingData['skills']]
                      ? 'bg-[var(--brand-primary)]'
                      : 'bg-gray-200'
                    }`}
                />
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-bold">{s.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="duo-btn duo-btn-primary w-full py-5"
      >
        Continue
      </button>
    </motion.div>
  )
}

function IdentityScreen({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightHeading level={2} className="mb-8 text-center">What&apos;s your name?</BrightHeading>

      <div className="space-y-6 mb-12">
        <div className="duo-card border-none bg-gray-100 p-0 overflow-hidden focus-within:ring-2 ring-[var(--brand-primary)]">
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => updateData('firstName', e.target.value)}
            placeholder="First Name"
            className="w-full px-8 py-6 bg-transparent text-xl font-bold outline-none placeholder:text-gray-400"
            required
          />
        </div>
        <div className="duo-card border-none bg-gray-100 p-0 overflow-hidden focus-within:ring-2 ring-[var(--brand-primary)]">
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => updateData('lastName', e.target.value)}
            placeholder="Last Name (Optional)"
            className="w-full px-8 py-6 bg-transparent text-xl font-bold outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!data.firstName}
        className="duo-btn duo-btn-primary w-full py-5 disabled:opacity-50"
      >
        Continue
      </button>
    </motion.div>
  )
}

function AcademicContextScreen({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightHeading level={2} className="mb-8 text-center">Your School Info</BrightHeading>

      <div className="space-y-4 mb-12">
        <select
          value={data.country}
          onChange={(e) => {
            updateData('country', e.target.value);
            updateData('school', '');
          }}
          className="duo-card w-full py-5 px-8 font-bold text-lg outline-none cursor-pointer appearance-none bg-gray-100 border-none"
        >
          <option value="">Select Country</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {data.country && (schoolsData as any)[data.country] ? (
          <select
            value={data.school}
            onChange={(e) => updateData('school', e.target.value)}
            className="duo-card w-full py-5 px-8 font-bold text-lg outline-none cursor-pointer appearance-none bg-gray-100 border-none"
          >
            <option value="">Select School</option>
            {(schoolsData as any)[data.country].map((s: string) => <option key={s} value={s}>{s}</option>)}
            <option value="Other">Other</option>
          </select>
        ) : (
          <div className="duo-card border-none bg-gray-100 p-0 overflow-hidden">
            <input
              type="text"
              value={data.school}
              onChange={(e) => updateData('school', e.target.value)}
              placeholder="Type School Name"
              className="w-full px-8 py-5 bg-transparent text-lg font-bold outline-none"
              disabled={!data.country}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {['CSEC', 'CAPE', 'Tertiary'].map((t) => (
            <button
              key={t}
              onClick={() => updateData('examTrack', t as any)}
              className={`duo-card py-4 text-center font-bold ${data.examTrack === t ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : ''
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!data.country || !data.school || !data.examTrack}
        className="duo-btn duo-btn-primary w-full py-5 disabled:opacity-50"
      >
        Continue
      </button>
    </motion.div>
  )
}

function CurrentLevelScreen({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightHeading level={2} className="mb-8 text-center">Your Current Form</BrightHeading>

      <div className="grid grid-cols-2 gap-4 mb-12">
        {forms.map((form) => (
          <button
            key={form}
            type="button"
            onClick={() => updateData('currentForm', form)}
            className={`duo-card py-6 text-xl font-black ${data.currentForm === form ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : ''
              }`}
          >
            {form}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!data.currentForm}
        className="duo-btn duo-btn-primary w-full py-5 disabled:opacity-50"
      >
        Continue
      </button>
    </motion.div>
  )
}

function SubjectSelectionScreen({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
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
      <BrightHeading level={2} className="mb-8 text-center">Your Core Trio</BrightHeading>

      <div className="grid grid-cols-1 gap-3 mb-12">
        {subjects.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => toggleSubject(subject)}
            className={`duo-card py-5 px-8 flex justify-between items-center font-bold ${data.subjects.includes(subject) ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : ''
              }`}
          >
            <span>{subject}</span>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${data.subjects.includes(subject) ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-gray-200'
              }`}>
              {data.subjects.includes(subject) && <span className="text-white text-lg">✓</span>}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={data.subjects.length === 0}
        className="duo-btn duo-btn-primary w-full py-5 disabled:opacity-50"
      >
        Assemble Path
      </button>
    </motion.div>
  )
}

function LearningGoalScreen({
  data,
  updateData,
  onNext,
}: {
  data: OnboardingData
  updateData: (field: keyof OnboardingData, value: any) => void
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <BrightHeading level={2} className="mb-8 text-center">Your Target</BrightHeading>

      <div className="space-y-4 mb-12">
        {learningGoals.map((goal) => (
          <button
            key={goal}
            type="button"
            onClick={() => updateData('learningGoal', goal)}
            className={`duo-card w-full text-left py-6 px-8 text-lg font-bold ${data.learningGoal === goal ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : ''
              }`}
          >
            {goal}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!data.learningGoal}
        className="duo-btn duo-btn-primary w-full py-5 disabled:opacity-50"
      >
        Continue
      </button>
    </motion.div>
  )
}

function DiagnosticSetupScreen({
  onNext,
}: {
  onNext: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="text-center"
    >
      <div className="mb-8 text-7xl">🧠</div>

      <BrightHeading level={2} className="mb-6">Ready to check your skills?</BrightHeading>

      <p className="text-xl text-[var(--text-secondary)] mb-12 max-w-md mx-auto leading-relaxed font-bold">
        We&apos;ll start with a quick diagnostic session to set your starting difficulty.
      </p>

      <div className="duo-card text-left bg-gray-50 border-none mb-12 p-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-2xl">✅</span>
          <span className="font-bold text-lg">No Grades or Rankings</span>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-2xl">✅</span>
          <span className="font-bold text-lg">Measures Logic & Speed</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-2xl">✅</span>
          <span className="font-bold text-lg">Sets Your baseline</span>
        </div>
      </div>

      <button
        onClick={onNext}
        className="duo-btn duo-btn-primary w-full py-5"
      >
        Start Diagnostic
      </button>
    </motion.div>
  )
}
