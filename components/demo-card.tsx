"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Demo card data structure
interface DemoCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  onImageError: (e: any, demo: any) => void;
  showEdit?: boolean;
  EditComponent?: React.ComponentType<{
    demoId: string;
    title: string;
    description: string;
    onUpdate: () => void;
  }>;
  onUpdate?: () => void;
}

// Helper function to get initials
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Card content component
const DemoCardContent = ({ demo, onImageError }: { demo: DemoCardProps, onImageError: (e: any, demo: any) => void }) => (
  <div className="p-6 flex flex-col h-full">
    <div className="flex items-center mb-4">
      <div className="bg-gray-100 rounded-lg p-3 mr-4 w-14 h-14 flex items-center justify-center">
        {demo.icon.endsWith('.svg') ? (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-gray-700"
          >
            {demo.id.includes("bmsd-case-study") && (
              <>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            )}
          </svg>
        ) : demo.icon ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <Image 
              src={demo.icon}
              alt={`${demo.title} icon`}
              width={40}
              height={40}
              onError={(e) => onImageError(e, demo)}
            />
          </div>
        ) : (
          // Fallback to initials if no valid icon
          <div className="text-gray-700 text-lg font-bold">
            {getInitials(demo.title)}
          </div>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{demo.title}</h3>
    </div>
    <p className="text-gray-600 text-sm flex-grow">{demo.description}</p>
    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
      <span className={`text-sm font-medium ${demo.path === "#" ? "text-gray-400" : "text-blue-600"}`}>
        {demo.path === "#" ? "Coming Soon" : "Explore Demo →"}
      </span>
    </div>
  </div>
);

export default function DemoCard({
  id,
  title,
  description,
  icon,
  path,
  onImageError,
  showEdit = false,
  EditComponent,
  onUpdate
}: DemoCardProps) {
  const router = useRouter();
  const demo = { id, title, description, icon, path, onImageError };
  
  const handleClick = (e: React.MouseEvent) => {
    if (path === "#") {
      e.preventDefault();
      return;
    }
    
    if (!path.startsWith("http")) {
      e.preventDefault();
      router.push("/demos/" + id);
    }
  };
  
  return (
    <div className="relative">
      {/* Edit button */}
      {showEdit && EditComponent && onUpdate && (
        <div className="absolute top-2 right-2 z-10">
          <EditComponent 
            demoId={id}
            title={title}
            description={description}
            onUpdate={onUpdate}
          />
        </div>
      )}
      
      {/* Card wrapper */}
      <div 
        onClick={handleClick}
        className={`block transition duration-200 ${
          path === "#" 
            ? "opacity-70 cursor-not-allowed" 
            : "hover:shadow-lg transform hover:-translate-y-1 cursor-pointer"
        }`}
      >
        {/* External link handling */}
        {path.startsWith("http") ? (
          <a 
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow overflow-hidden h-full">
              <DemoCardContent demo={demo} onImageError={onImageError} />
            </div>
          </a>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden h-full">
            <DemoCardContent demo={demo} onImageError={onImageError} />
          </div>
        )}
      </div>
    </div>
  );
} 