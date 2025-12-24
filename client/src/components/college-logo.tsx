interface CollegeLogoProps {
  className?: string;
}

export function CollegeLogo({ className = "w-6 h-6" }: CollegeLogoProps) {
  return (
    <img 
      src="/college-logo.png" 
      alt="College Logo" 
      className={className}
    />
  );
}
