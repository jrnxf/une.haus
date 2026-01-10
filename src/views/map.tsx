import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Globe } from "~/components/globe";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { FlagEmoji } from "~/components/ui/flag-emoji";
import { type UsersWithLocationsData } from "~/lib/users";

type UserWithLocation = UsersWithLocationsData[number];

/**
 * Calculate the Haversine distance between two points on Earth.
 * Returns distance in kilometers.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Given a list of users with locations, order them to maximize travel distance.
 * Uses a greedy "farthest insertion" approach starting from the first user.
 */
function orderByMaxDistance(users: UserWithLocation[]): UserWithLocation[] {
  if (users.length <= 1) return users;

  const result: UserWithLocation[] = [];
  const remaining = new Set(users);

  // Start with the first user
  const first = users[0]!;
  result.push(first);
  remaining.delete(first);

  // Greedily pick the farthest user from the current position
  while (remaining.size > 0) {
    const current = result[result.length - 1]!;
    let farthest: UserWithLocation | null = null;
    let maxDistance = -1;

    for (const candidate of remaining) {
      const distance = haversineDistance(
        current.location.lat,
        current.location.lng,
        candidate.location.lat,
        candidate.location.lng,
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        farthest = candidate;
      }
    }

    if (farthest) {
      result.push(farthest);
      remaining.delete(farthest);
    }
  }

  return result;
}

export function MapView({ users }: { users: UsersWithLocationsData }) {
  const orderedUsers = useMemo(() => orderByMaxDistance(users), [users]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentUser = orderedUsers[currentIndex];

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % orderedUsers.length);
  }, [orderedUsers.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(
      (prev) => (prev - 1 + orderedUsers.length) % orderedUsers.length,
    );
  }, [orderedUsers.length]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No users with locations found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-full max-h-[70vh] max-w-[70vh]">
            <Globe location={currentUser.location} />
          </div>
        </div>

        <div className="from-background via-background/90 pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t via-35% to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 p-6">
        <Link
          to="/users/$userId"
          params={{ userId: currentUser.id }}
          className="group flex flex-col items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Avatar
            cloudflareId={currentUser.avatarId}
            alt={currentUser.name}
            className="ring-primary/20 size-20 ring-2 ring-offset-2 transition-all group-hover:ring-4"
          >
            <AvatarImage width={160} quality={80} className="object-cover" />
            <AvatarFallback
              className="flex w-full items-center justify-center text-2xl font-semibold"
              name={currentUser.name}
            />
          </Avatar>

          <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-semibold">{currentUser.name}</h2>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <FlagEmoji
                className="text-lg"
                location={currentUser.location}
              />
              <span>{currentUser.location.label}</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            aria-label="Previous user"
          >
            <ChevronLeftIcon className="size-5" />
          </Button>

          <div className="text-muted-foreground min-w-[80px] text-center text-sm">
            {currentIndex + 1} / {orderedUsers.length}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            aria-label="Next user"
          >
            <ChevronRightIcon className="size-5" />
          </Button>

          {currentIndex !== 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={reset}
              aria-label="Reset to first user"
            >
              <RotateCcwIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
