import { useState, useRef, useEffect } from "react";
import debounce from "lodash/debounce";
import PropTypes from "prop-types";

interface EnvoiAddressSearchProps {
  onAddressSelect: (selectedAddress: string) => void;
  placeholder?: string;
}

const EnvoiAddressSearch: React.FC<EnvoiAddressSearchProps> = ({
  onAddressSelect,
  placeholder = "Search by enVoi name or enter address",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [users, setUsers] = useState<
    {
      name: string;
      address: string;
      avatar?: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidAlgorandAddress = (address: string): boolean => {
    return /^[A-Z2-7]{58}$/.test(address);
  };

  const searchEnvoi = debounce(async (query: string) => {
    if (!query) {
      setUsers([]);
      return;
    }

    // If it's a valid Algorand address, don't search
    if (isValidAlgorandAddress(query)) {
      setUsers([]);
      handleDirectAddressInput(query);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.envoi.sh/api/search?pattern=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      if (data?.results && Array.isArray(data.results)) {
        const formattedUsers = data.results.map((user: any) => ({
          name: user.name,
          address: user.address,
          avatar: user.metadata?.avatar ?? undefined,
        }));
        setUsers(formattedUsers);
        setIsOpen(true);
        setHighlightedIndex(-1);
      }
    } catch (error) {
      console.error("Error searching enVoi:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleDirectAddressInput = (address: string) => {
    setSelectedAddress(address);
    onAddressSelect(address);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSelectedAddress(null);

    if (isValidAlgorandAddress(value)) {
      handleDirectAddressInput(value);
    } else if (value.length >= 2) {
      searchEnvoi(value);
    } else {
      setUsers([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (user: { name: string; address: string }) => {
    setInputValue(user.name);
    setSelectedAddress(user.address);
    onAddressSelect(user.address);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < users.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < users.length) {
          handleSelect(users[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        className="w-full rounded-tremor-default border border-tremor-border bg-tremor-background px-3 py-2 text-tremor-content shadow-tremor-input outline-none focus:border-tremor-brand focus:ring-2 focus:ring-tremor-brand-subtle"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => users.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="envoi-search-listbox"
        aria-activedescendant={
          highlightedIndex >= 0 ? `envoi-option-${highlightedIndex}` : undefined
        }
      />
      {selectedAddress && (
        <div className="mt-2 rounded-tremor-default border border-tremor-border bg-tremor-background-subtle p-2">
          <span className="text-sm text-tremor-content-subtle">
            Selected address:
          </span>
          <div className="mt-1 break-all font-mono text-sm text-tremor-content">
            {selectedAddress}
          </div>
        </div>
      )}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="envoi-search-listbox"
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-tremor-default border border-tremor-border bg-tremor-background shadow-lg"
        >
          {isLoading ? (
            <div className="p-2 text-tremor-content-subtle">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-2 text-tremor-content-subtle">
              No results found
            </div>
          ) : (
            users.map((user, index) => (
              <div
                key={user.address}
                id={`envoi-option-${index}`}
                role="option"
                aria-selected={highlightedIndex === index}
                className={`flex cursor-pointer items-center gap-2 p-2 hover:bg-tremor-background-muted ${
                  highlightedIndex === index ? "bg-tremor-background-muted" : ""
                }`}
                onClick={() => handleSelect(user)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(user);
                  }
                }}
                tabIndex={0}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.name}'s avatar`}
                    className="size-6 rounded-full"
                  />
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full bg-tremor-brand text-sm font-medium text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-tremor-content">
                    {user.name}
                  </span>
                  <span className="text-sm text-tremor-content-subtle">
                    {user.address}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

EnvoiAddressSearch.propTypes = {
  onAddressSelect: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

export default EnvoiAddressSearch;
