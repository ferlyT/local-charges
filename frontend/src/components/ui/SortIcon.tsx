import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SortIconProps {
  field: string;
  sortBy: string;
  sortOrder: string;
}

/**
 * Reusable table header column sort indicator icon.
 */
export function SortIcon({ field, sortBy, sortOrder }: SortIconProps) {
  if (sortBy !== field) {
    return <ChevronsUpDown size={14} className="text-secondary/40 group-hover:text-secondary/70" />;
  }
  return sortOrder === 'asc' ? (
    <ChevronUp size={14} className="text-tertiary" />
  ) : (
    <ChevronDown size={14} className="text-tertiary" />
  );
}

export default SortIcon;
