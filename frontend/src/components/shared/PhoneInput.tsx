"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { GB, SE, DK, NO, NL, DE, IT, FR, ES, FI, BE, AT, PT, GR, CZ, IE, CH, PL, AU, NZ, JP, CN, KR, IN, SG, TH, MY, ID, PH, VN, HK, TW } from 'country-flag-icons/react/3x2';

const COUNTRIES = [
  // Europe
  { code: "+43", name: "Austria", component: AT },
  { code: "+32", name: "Belgium", component: BE },
  { code: "+420", name: "Czech Republic", component: CZ },
  { code: "+45", name: "Denmark", component: DK },
  { code: "+358", name: "Finland", component: FI },
  { code: "+33", name: "France", component: FR },
  { code: "+49", name: "Germany", component: DE },
  { code: "+30", name: "Greece", component: GR },
  { code: "+36", name: "Hungary" },
  { code: "+354", name: "Iceland" },
  { code: "+353", name: "Ireland", component: IE },
  { code: "+39", name: "Italy", component: IT },
  { code: "+31", name: "Netherlands", component: NL },
  { code: "+47", name: "Norway", component: NO },
  { code: "+48", name: "Poland", component: PL },
  { code: "+351", name: "Portugal", component: PT },
  { code: "+40", name: "Romania" },
  { code: "+34", name: "Spain", component: ES },
  { code: "+46", name: "Sweden", component: SE },
  { code: "+41", name: "Switzerland", component: CH },
  { code: "+44", name: "United Kingdom", component: GB },

  // Oceania
  { code: "+61", name: "Australia", component: AU },
  { code: "+64", name: "New Zealand", component: NZ },

  // Asia
  { code: "+86", name: "China", component: CN },
  { code: "+852", name: "Hong Kong", component: HK },
  { code: "+91", name: "India", component: IN },
  { code: "+62", name: "Indonesia", component: ID },
  { code: "+81", name: "Japan", component: JP },
  { code: "+60", name: "Malaysia", component: MY },
  { code: "+63", name: "Philippines", component: PH },
  { code: "+65", name: "Singapore", component: SG },
  { code: "+82", name: "South Korea", component: KR },
  { code: "+886", name: "Taiwan", component: TW },
  { code: "+66", name: "Thailand", component: TH },
  { code: "+84", name: "Vietnam", component: VN },
].sort((a, b) => a.name.localeCompare(b.name))

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// Map country codes to phone codes
const COUNTRY_TO_PHONE_CODE: Record<string, string> = {
  'GB': '+44', 'SE': '+46', 'NO': '+47', 'DK': '+45', 'FI': '+358',
  'DE': '+49', 'FR': '+33', 'ES': '+34', 'IT': '+39', 'NL': '+31',
  'BE': '+32', 'CH': '+41', 'AT': '+43', 'PT': '+351', 'GR': '+30',
  'PL': '+48', 'CZ': '+420', 'IE': '+353', 'HU': '+36', 'IS': '+354',
  'RO': '+40', 'AU': '+61', 'NZ': '+64', 'CN': '+86', 'HK': '+852',
  'IN': '+91', 'ID': '+62', 'JP': '+81', 'MY': '+60', 'PH': '+63',
  'SG': '+65', 'KR': '+82', 'TW': '+886', 'TH': '+66', 'VN': '+84',
}

export function PhoneInput({ value, onChange, placeholder = "Phone number", className }: PhoneInputProps) {
  const [open, setOpen] = useState(false)
  const [countryCode, setCountryCode] = useState("+46") // Default to Sweden
  const [searchQuery, setSearchQuery] = useState("")

  // Detect country from IP on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Check if we have a cached country code (valid for 7 days)
        const cached = localStorage.getItem('detected_country_code')
        const cachedTime = localStorage.getItem('detected_country_code_time')
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

        if (cached && cachedTime && parseInt(cachedTime) > sevenDaysAgo) {
          setCountryCode(cached)
          return
        }

        // Use free IP geolocation API (ipapi.co - 1000 requests/day free)
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        const detectedCode = COUNTRY_TO_PHONE_CODE[data.country_code]

        if (detectedCode) {
          setCountryCode(detectedCode)
          localStorage.setItem('detected_country_code', detectedCode)
          localStorage.setItem('detected_country_code_time', Date.now().toString())
        }
      } catch (error) {
        console.log('Could not detect country from IP, using default:', error)
      }
    }

    detectCountry()
  }, [])
  
  const filteredCountries = useMemo(() => {
    if (!searchQuery) return COUNTRIES
    return COUNTRIES.filter(country => 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.includes(searchQuery)
    )
  }, [searchQuery])
  
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[7]
  
  const handleCountrySelect = (code: string) => {
    setCountryCode(code)
    setOpen(false)
    setSearchQuery("")
  }
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/\D/g, "")
    onChange(`${countryCode}${phone}`)
  }
  
  const phoneNumber = value.replace(countryCode, "")
  
  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[120px] justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="w-5 h-3">
                {selectedCountry.component && <selectedCountry.component className="w-full h-full" />}
              </span>
              <span className="text-sm">{selectedCountry.code}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start" sideOffset={5}>
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="h-[250px]">
            <div className="p-1">
              {filteredCountries.map((country) => {
                const FlagComponent = country.component
                return (
                  <button
                    key={country.code}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent rounded-md",
                      countryCode === country.code && "bg-accent"
                    )}
                    onClick={() => handleCountrySelect(country.code)}
                  >
                    {FlagComponent && (
                      <span className="w-6 h-4">
                        <FlagComponent className="w-full h-full" />
                      </span>
                    )}
                    {!FlagComponent && (
                      <span className="w-6 h-4 flex items-center justify-center text-xs font-bold">
                        {country.code.replace('+', '')}
                      </span>
                    )}
                    <span className="flex-1 text-left">{country.name}</span>
                    <span className="text-muted-foreground">{country.code}</span>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        placeholder={placeholder}
        value={phoneNumber}
        onChange={handlePhoneChange}
        className="flex-1"
      />
    </div>
  )
}