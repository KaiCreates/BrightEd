export type Subject =
    | 'Mathematics'
    | 'English'
    | 'Principles of Business'
    | 'Economics'
    | 'Biology'
    | 'Chemistry'
    | 'Physics'
    | 'Information Technology'
    | 'Social Studies'
    | 'Geography'
    | 'History'
    | 'Agricultural Science'
    | 'Principles of Accounts'
    | 'General';

export function getSubjectFromSourceFile(sourceFile: string): Subject {
    if (!sourceFile) return 'General';

    const lower = sourceFile.toLowerCase();

    // Principles of Business (check first to avoid overlap)
    if (lower.includes('business') || lower.includes('pob') || lower.includes('principles of business')) {
        return 'Principles of Business';
    }

    // Mathematics
    if (lower.includes('mathematics') || lower.includes('math')) {
        // Exclude other subjects that might contain "math" substring if any (unlikely but safe)
        if (!lower.includes('economic')) {
            return 'Mathematics';
        }
    }

    // English
    if (lower.includes('english')) {
        return 'English';
    }

    // Economics
    if (lower.includes('economic')) {
        return 'Economics';
    }

    // Sciences
    if (lower.includes('biology')) return 'Biology';
    if (lower.includes('chemistry')) return 'Chemistry';
    if (lower.includes('physics')) return 'Physics';

    // IT
    if (lower.includes('information') || lower.includes('technology') || lower.includes(' it ')) {
        return 'Information Technology';
    }

    // Humanities
    if (lower.includes('social')) return 'Social Studies';
    if (lower.includes('geography')) return 'Geography';
    if (lower.includes('history')) return 'History';
    if (lower.includes('agri') || lower.includes('agricultural')) return 'Agricultural Science';
    if (lower.includes('poa') || lower.includes('accounts')) return 'Principles of Accounts';

    return 'General';
}

export function getSubjectStyle(subject: string): { icon: string; color: string; borderColor: string } {
    const s = subject;

    switch (s) {
        case 'Mathematics':
            return { icon: '📐', color: 'bg-green-500', borderColor: 'border-green-600' };
        case 'Principles of Business':
            return { icon: '💼', color: 'bg-purple-500', borderColor: 'border-purple-600' };
        case 'Economics':
            return { icon: '📊', color: 'bg-blue-500', borderColor: 'border-blue-600' };
        case 'Biology':
            return { icon: '🧬', color: 'bg-teal-500', borderColor: 'border-teal-600' }; // Use DNA icon for Bio
        case 'Chemistry':
            return { icon: '⚗️', color: 'bg-pink-500', borderColor: 'border-pink-600' };
        case 'Physics':
            return { icon: '⚛️', color: 'bg-indigo-500', borderColor: 'border-indigo-600' };
        case 'Information Technology':
            return { icon: '💻', color: 'bg-cyan-600', borderColor: 'border-cyan-700' };
        case 'English':
            return { icon: '📝', color: 'bg-orange-500', borderColor: 'border-orange-600' };
        case 'Social Studies':
            return { icon: '🌍', color: 'bg-yellow-500', borderColor: 'border-yellow-600' };
        case 'Geography':
            return { icon: '🗺️', color: 'bg-emerald-500', borderColor: 'border-emerald-600' };
        case 'History':
            return { icon: '📜', color: 'bg-amber-700', borderColor: 'border-amber-800' };
        case 'Agricultural Science':
            return { icon: '🌱', color: 'bg-emerald-600', borderColor: 'border-emerald-700' };
        case 'Principles of Accounts':
            return { icon: '📊', color: 'bg-blue-600', borderColor: 'border-blue-700' };
        default:
            return { icon: '📚', color: 'bg-gray-500', borderColor: 'border-gray-600' };
    }
}
