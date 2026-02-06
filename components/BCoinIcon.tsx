import Image from 'next/image';

interface BCoinIconProps {
    size?: number;
    className?: string;
}

export function BCoinIcon({ size = 24, className = '' }: BCoinIconProps) {
    return (
        <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
            <Image
                src="/b-coin.png"
                alt="B-Coin"
                fill
                sizes={`${size}px`}
                className="object-contain"
            />
        </div>
    );
}
