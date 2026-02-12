/**
 * BrightEd Economy Engine — Order Narrative Generation
 * Creates contextual stories and consequences for orders
 */

import { Order, CustomerType, OrderNarrative } from './economy-types';

/**
 * Generate narrative context for an order
 */
export function generateOrderNarrative(
    order: Order,
    businessCategory: string
): OrderNarrative {
    const narratives = getNarrativeTemplates(businessCategory, order.customerType);
    const template = narratives[Math.floor(Math.random() * narratives.length)];

    if (!template) {
        return {
            context: `Order from ${order.customerName}`,
            successConsequence: 'Customer was satisfied.',
            failureConsequence: 'Customer was disappointed.'
        };
    }

    return {
        context: template.context.replace('{customer}', order.customerName),
        urgencyReason: template.urgencyReason,
        customerBackground: template.customerBackground,
        successConsequence: template.successConsequence,
        failureConsequence: template.failureConsequence,
    };
}

/**
 * Get narrative templates based on business type and customer
 */
function getNarrativeTemplates(
    businessCategory: string,
    customerType: CustomerType
): OrderNarrative[] {
    const templates: Record<string, OrderNarrative[]> = {
        service: [
            {
                context: '{customer} needs a fresh look for an important event this weekend.',
                urgencyReason: 'Wedding coming up',
                customerBackground: 'Regular customer, always tips well',
                successConsequence: 'They love it! Posted a glowing review and referred 3 friends.',
                failureConsequence: 'Disappointed. They went to your competitor and told everyone about it.',
            },
            {
                context: '{customer} is a first-timer, nervous about trying a new stylist.',
                customerBackground: 'New to the area, looking for a regular spot',
                successConsequence: 'You gained their trust! They booked their next 3 appointments.',
                failureConsequence: 'They left unsatisfied and posted a negative review online.',
            },
            {
                context: '{customer} needs a quick touch-up before a job interview.',
                urgencyReason: 'Interview in 2 hours',
                successConsequence: 'They got the job and credited you! Word spread fast.',
                failureConsequence: 'They missed their interview slot. Your reputation took a hit.',
            },
        ],
        retail: [
            {
                context: '{customer} is stocking up for the week. They\'re comparing your prices to the competition.',
                customerBackground: 'Price-conscious shopper',
                successConsequence: 'Fast service impressed them. They\'ll be back next week.',
                failureConsequence: 'Slow checkout drove them away. They found a faster store.',
            },
            {
                context: '{customer} needs ingredients for tonight\'s dinner party.',
                urgencyReason: 'Guests arriving in 3 hours',
                successConsequence: 'Dinner was a hit! They recommended your store to their friends.',
                failureConsequence: 'You were out of stock. They had to cancel the party.',
            },
            {
                context: '{customer} is a regular who always shops here on their way home.',
                customerBackground: 'Loyal customer for 6 months',
                successConsequence: 'Consistent quality keeps them coming back. They brought their family.',
                failureConsequence: 'Poor experience broke their routine. They found a new store.',
            },
        ],
        food: [
            {
                context: '{customer} is craving comfort food after a long day at work.',
                customerBackground: 'Works nearby, potential regular',
                successConsequence: 'Delicious! They became a regular and bring coworkers.',
                failureConsequence: 'Food was cold and bland. They warned their coworkers.',
            },
            {
                context: '{customer} is ordering for their entire office team.',
                urgencyReason: 'Lunch meeting in 30 minutes',
                customerBackground: 'Office manager with catering budget',
                successConsequence: 'Office loved it! You got a weekly catering contract.',
                failureConsequence: 'Late delivery ruined their meeting. Lost a major client.',
            },
            {
                context: '{customer} heard about your food from a friend and wants to try it.',
                customerBackground: 'Food blogger with 10k followers',
                successConsequence: 'They posted a rave review! Orders doubled overnight.',
                failureConsequence: 'Disappointed. Negative review went viral.',
            },
        ],
        digital: [
            {
                context: '{customer} needs a logo for their startup launch next week.',
                urgencyReason: 'Investor pitch on Monday',
                customerBackground: 'Startup founder, tight budget',
                successConsequence: 'They secured funding! Referred you to 5 other startups.',
                failureConsequence: 'Missed deadline. They hired someone else and left a bad review.',
            },
            {
                context: '{customer} wants social media graphics for their product launch.',
                urgencyReason: 'Campaign starts tomorrow',
                customerBackground: 'Small business owner',
                successConsequence: 'Campaign was a success! They want to work with you long-term.',
                failureConsequence: 'Poor quality graphics hurt their launch. They demanded a refund.',
            },
            {
                context: '{customer} needs a website redesign to modernize their brand.',
                customerBackground: 'Established business, good budget',
                successConsequence: 'They\'re thrilled! Signed a retainer for ongoing work.',
                failureConsequence: 'Design didn\'t match their vision. Project cancelled.',
            },
        ],
    };

    // VIP customer narratives (higher stakes)
    if (customerType === 'vip') {
        return [
            {
                context: `{customer} is a high-profile client with specific expectations.`,
                urgencyReason: 'Reputation on the line',
                customerBackground: 'VIP with industry connections',
                successConsequence: 'Exceeded expectations! They opened doors to premium clients.',
                failureConsequence: 'Failed to deliver. Your reputation in elite circles is damaged.',
            },
        ];
    }

    // Business customer narratives (recurring potential)
    if (customerType === 'business') {
        return [
            {
                context: `{customer} represents a company evaluating you for a contract.`,
                urgencyReason: 'Trial order for potential partnership',
                customerBackground: 'Corporate buyer',
                successConsequence: 'Impressed! Secured a lucrative ongoing contract.',
                failureConsequence: 'Didn\'t meet standards. Lost the contract opportunity.',
            },
        ];
    }

    return templates[businessCategory] || templates.retail || [];
}

/**
 * Generate consequence message based on order outcome
 */
export function generateConsequenceMessage(
    narrative: OrderNarrative,
    qualityScore: number,
    onTime: boolean,
    loyaltyChange: number
): string {
    const isSuccess = qualityScore >= 70 && onTime;

    let message = isSuccess ? narrative.successConsequence : narrative.failureConsequence;

    // Add loyalty impact
    if (loyaltyChange > 10) {
        message += ' Customer loyalty increased significantly.';
    } else if (loyaltyChange < -10) {
        message += ' Customer trust was damaged.';
    }

    return message;
}

/**
 * Generate urgency indicator for order
 */
export function getUrgencyLevel(order: Order): 'low' | 'medium' | 'high' | 'critical' {
    const deadline = new Date(order.deadline);
    const now = new Date();
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) return 'critical';
    if (hoursRemaining < 1) return 'high';
    if (hoursRemaining < 4) return 'medium';
    return 'low';
}

/**
 * Generate customer mood description
 */
export function getCustomerMoodDescription(mood: Order['customerMood']): string {
    const descriptions = {
        happy: 'Excited and friendly',
        neutral: 'Professional and straightforward',
        impatient: 'In a hurry, expects quick service',
        demanding: 'High expectations, detail-oriented',
    };

    return descriptions[mood];
}
