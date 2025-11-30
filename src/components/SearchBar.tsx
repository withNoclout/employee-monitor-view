import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
    employees: any[];
    onSelectEmployee: (employeeId: string) => void;
}

export const SearchBar = ({ employees, onSelectEmployee }: SearchBarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setQuery("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter suggestions
    useEffect(() => {
        if (query.trim().length > 0) {
            const filtered = employees.filter(e =>
                e.name.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5); // Limit to 5 suggestions
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    }, [query, employees]);

    const handleSelect = (employee: any) => {
        onSelectEmployee(employee.id);
        setQuery(""); // Clear query but keep open? Or close?
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative flex items-center justify-end">
            <AnimatePresence mode="wait">
                {!isOpen ? (
                    <motion.div
                        key="icon"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => {
                                setIsOpen(true);
                                setTimeout(() => inputRef.current?.focus(), 100);
                            }}
                        >
                            <Search className="w-5 h-5" />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="bar"
                        initial={{ width: 40, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 40, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative"
                    >
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search employee..."
                                className="pl-9 pr-9 rounded-full bg-background/50 backdrop-blur-sm border-primary/30 focus-visible:ring-primary/50"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 w-7 h-7 rounded-full hover:bg-muted"
                                onClick={() => {
                                    setIsOpen(false);
                                    setQuery("");
                                }}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>

                        {/* Suggestions Dropdown */}
                        <AnimatePresence>
                            {suggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full mt-2 left-0 right-0 bg-popover/95 backdrop-blur-md border border-border/50 rounded-lg shadow-xl overflow-hidden z-50"
                                >
                                    <div className="py-1">
                                        {suggestions.map((employee) => (
                                            <button
                                                key={employee.id}
                                                className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors flex items-center justify-between group"
                                                onClick={() => handleSelect(employee)}
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                                        {employee.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {employee.departmentName}
                                                    </p>
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${employee.status === 'excellent' ? 'bg-success' :
                                                        employee.status === 'good' ? 'bg-warning' : 'bg-danger'
                                                    }`} />
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
