"use client";

import Image from "next/image";

export default function LoadingOverlay({ show }: { show: boolean }) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-9999">
            <style>{`
                /* Perfect, continuous, linear rotation */
                @keyframes continuous-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                /* Soft, organic breathing scale and outer glow change */
                @keyframes breathing-glow {
                    0%, 100% { 
                        transform: scale(0.92);
                        filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.2));
                    }
                    50% { 
                        transform: scale(1.08);
                        filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6));
                    }
                }
                /* Smooth expanding radar ring that fades out */
                @keyframes sonar-ripple {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(2.4); opacity: 0; }
                }
                
                .animate-continuous-spin {
                    animation: continuous-spin 1s linear infinite;
                }
                .animate-breathing-glow {
                    animation: breathing-glow 2.5s ease-in-out infinite;
                }
                .animate-sonar-ripple {
                    animation: sonar-ripple 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
                }
            `}</style>

            <div className="relative flex items-center justify-center">
                {/* Outward fading ambient rings */}
                <div className="absolute w-12.5 h-12.5 rounded-full border border-white/30 animate-sonar-ripple" />
                <div className="absolute w-12.5 h-12.5 rounded-full border border-white/10 animate-sonar-ripple [animation-delay:0.8s]" />

                {/* Layered animation core */}
                <div className="animate-continuous-spin">
                    <div className="animate-breathing-glow flex items-center justify-center">
                        <Image
                            src="/default/cyrax.png"
                            width={50}
                            height={50}
                            alt="Loading..."
                            sizes="50px"
                            className="rounded-full object-cover"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}