import { useEffect, useState } from "react";

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    format?: (value: number) => string;
    className?: string;
}

export const AnimatedNumber = ({
    value,
    duration = 1000,
    format = (v) => Math.round(v).toString(),
    className
}: AnimatedNumberProps) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        const startValue = displayValue;
        const endValue = value;

        if (startValue === endValue) return;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function (easeOutExpo)
            const easeOut = (x: number): number => {
                return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
            };

            const currentProgress = easeOut(progress);
            const currentValue = startValue + (endValue - startValue) * currentProgress;

            setDisplayValue(currentValue);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, [value, duration]);

    return (
        <span className={className}>
            {format(displayValue)}
        </span>
    );
};
