import { bearing, centroid, distance } from "@turf/turf";
import { Feature, FeatureCollection } from "geojson";
import { GeoJson, Map, TileComponent } from "pigeon-maps";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { guessList, Suburb } from "./List";

export function GeoMap() {
  //data
  const [allGeoJsonData, setGeoJsonData] = useState<Feature[] | undefined>(
    undefined,
  );
  const [suburbToGuess, setSuburbToGuess] = useState<Feature | undefined>(
    undefined,
  );

  const suburbToGuessCentroid = useMemo(() => {
    let pos;
    if (suburbToGuess) {
      pos = centroid(suburbToGuess.geometry).geometry.coordinates;
      return [pos[1], pos[0]];
    } else {
      return [-35.28, 149.128998];
    }
  }, [suburbToGuess]);

  //state
  const MAX_GUESSES = 5;
  const [guesses, setGuesses] = useState<string[]>([]);

  const [won, setHasWon] = useState(false);

  const [lost, setHasLost] = useState(false);

  const [showFullMap, setShowFullMap] = useState(true);

  //input related
  const [inputSuburb, setInputSuburb] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const allSuburbs = useMemo(
    () => allGeoJsonData?.map((s) => s.properties!.name),
    [allGeoJsonData],
  );
  const filteredSuburbs = useMemo(() => {
    if (inputSuburb.length === 0) return [];
    return allSuburbs?.filter((s: string) =>
      s.toLocaleUpperCase().includes(inputSuburb.toLocaleUpperCase()),
    );
  }, [allSuburbs, inputSuburb]);

  const todayGuess = useMemo(() => getTodaysGuessFromList(guessList), []);

  useEffect(() => {
    fetch("/Suburbs.geojson")
      .then((response) => response.json())
      .then((data: FeatureCollection) => {
        setGeoJsonData(data.features);
        const selected = data.features.find(
          (f) => todayGuess.name === f.properties!.name,
        );
        if (selected) {
          setSuburbToGuess(selected);
        }
        
        // Load today's game state from localStorage
        const today = new Date().toDateString();
        const savedGame = localStorage.getItem(`cbrle_game_${today}`);
        if (savedGame) {
          const { guesses: savedGuesses, won: savedWon, lost: savedLost } = JSON.parse(savedGame);
          setGuesses(savedGuesses);
          setHasWon(savedWon);
          setHasLost(savedLost);
        }
      });
  }, [todayGuess]);

  function onKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      tryGuess(inputSuburb);
    }
  }

  function isCorrectGuess(guess: string, suburbToGuess: string): boolean {
    return guess.toLocaleUpperCase() === suburbToGuess.toLocaleUpperCase();
  }

  function tryGuess(inputGuess: string) {
    const guess = inputGuess.toLocaleUpperCase();

    if (!allSuburbs?.map((a) => a.toLocaleUpperCase()).includes(guess)) {
      toast.error("Invalid suburb!");
      return;
    }

    if (guesses.includes(guess)) {
      toast.error("Already guessed!");
      return;
    }

    const currentGuesses = [...guesses, guess];

    setGuesses(currentGuesses);
    setInputFocused(false);
    setInputSuburb("");

    if (isCorrectGuess(guess, suburbToGuess?.properties!.name)) {
      onWin();
      saveGameState(currentGuesses, true, false);
    } else {
      if (currentGuesses.length >= MAX_GUESSES) {
        onLose();
        saveGameState(currentGuesses, false, true);
      } else {
        saveGameState(currentGuesses, false, false);
      }
    }
  }

  function saveGameState(guesses: string[], won: boolean, lost: boolean) {
    const today = new Date().toDateString();
    localStorage.setItem(`cbrle_game_${today}`, JSON.stringify({ guesses, won, lost }));
  }

  function onWin() {
    setHasWon(true);
  }

  function onLose() {
    setHasLost(true);
  }

  function getTodaysGuessFromList(list: Suburb[]): Suburb {
    const today = new Date();
    const startDate = new Date(2024, 6, 11);

    const timeDifference = today.getTime() - startDate.getTime();
    const daysSinceStart = Math.floor(timeDifference / (1000 * 3600 * 24));

    return list[daysSinceStart % list.length];
  }

  const getLetterHint = (name: string): string => {
    const first = name.charAt(0).toUpperCase();
    const last = name.charAt(name.length - 1).toUpperCase();
    return `Starts with ${first}, ends with ${last}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 my-2 min-h-16">
        {guesses.map((g, index) => (
          <div key={index} className={`px-3 py-1 rounded-full text-sm font-medium ${isCorrectGuess(g, suburbToGuess?.properties!.name) ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
            {isCorrectGuess(g, suburbToGuess?.properties!.name) ? "✅" : "❌"} {g}
          </div>
        ))}
        {guesses.length > 0 && <div className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-200 text-blue-800`}>❔ {todayGuess.hint}</div>}
        {guesses.length > 1 && <div className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-200 text-blue-800`}>❔ {todayGuess.letters} letters</div>}
        {guesses.length > 3 && (<div className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-200 text-blue-800`}>❔ {getLetterHint(todayGuess.name)}</div>)}
      </div>
      <div className="mapDiv relative" style={{ width: "100%", height: "100%" }}>
        {allGeoJsonData && suburbToGuess && (
          <Map
            tileComponent={showFullMap ? ImgTile : Blank}
            /* this is dumb, looks like you can actually inline a string here in pigeon-maps...
          // @ts-ignore */
            height={"60vh"}
            center={[suburbToGuessCentroid[0], suburbToGuessCentroid[1]]}
            defaultZoom={13}
            zoom={13}
            mouseEvents={false}
            touchEvents={false}
          >
            <GeoJson
              data={toFeatureCollection(suburbToGuess)}
              styleCallback={(_: Feature, hover: boolean) =>
                hover
                  ? {
                      fill: "#00ceff",
                      strokeWidth: "4",
                      stroke: "white",
                      strokeDasharray: "5, 5",
                    }
                  : {
                      fill: "#00c9f9",
                      strokeWidth: "4",
                      stroke: "white",
                      strokeDasharray: "5, 5",
                    }
              }
            />
          </Map>
        )}
        {(won || lost) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 rounded">
            <div className="bg-white rounded-lg p-8 text-center shadow-lg space-y-2">
              <h2 className="text-2xl font-bold">{won ? `${getGuessBlurb(guesses.length)}` : "Better luck next time!"}</h2>
              <h2 className="text-2xl">It was <strong>{suburbToGuess?.properties!.name}</strong></h2>
              {won && <h2 className="text-2xl">Guessed in {guesses.length}</h2>}
              <Button onClick={() => handleShare(won, guesses.length, MAX_GUESSES, todayGuess.name)}>Share</Button>
            </div>
          </div>
        )}
      </div>
      {!won && !lost && (
        <div className="relative w-full max-w-sm pointer-events-none">
          <div className="flex w-full items-center space-x-2 pointer-events-auto">
            <Input
              placeholder="Guess..."
              value={inputSuburb}
              onChange={(e) => setInputSuburb(e.target.value)}
              onKeyDown={(e) => onKeyPress(e)}
            />
            <Button onClick={() => tryGuess(inputSuburb)}>
              Guess {guesses.length} / {MAX_GUESSES}
            </Button>
          </div>
          {inputSuburb.length > 0 && (
            <div className="absolute left-0 bottom-full mb-1 w-full max-h-48 z-10 pointer-events-auto">
              <div className="border rounded bg-white shadow-lg overflow-y-auto max-h-48">
                {filteredSuburbs &&
                  filteredSuburbs?.map((s) => (
                    <div
                      className="p-2 transition-colors hover:bg-slate-200 cursor-pointer"
                      onClick={() => tryGuess(s)}
                      key={s}
                    >
                      {s}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

    </>
  );
}

function toFeatureCollection(feature: Feature): FeatureCollection {
  return { type: "FeatureCollection", features: [feature] };
}

function handleShare(won: boolean, guessCount: number, maxGuesses: number, suburbName: string): void {
  const emoji = won ? "✅" : "❌";
  const result = won ? `${guessCount}/${maxGuesses}` : "X/" + maxGuesses;
  const text = `CBRLE ${result}\n\n${emoji.repeat(guessCount)}${"⬜".repeat(Math.max(0, maxGuesses - guessCount))}\n\nGuess the suburb!\nhttps://cbrle.vercel.app/`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy");
    });
  }
}

function getDistanceFromGuess(
  guess: string,
  suburbFeatures: Feature[] | undefined,
  correctSuburb: Feature | undefined,
): number {
  if (!suburbFeatures || !correctSuburb) return -1;
  const guessFeature = suburbFeatures.find(
    (f) => f.properties!.name.toLocaleUpperCase() === guess,
  );
  if (!guessFeature) return -1;
  return distance(
    centroid(correctSuburb.geometry).geometry,
    centroid(guessFeature.geometry).geometry,
  );
}

function getGuessBlurb(guessCount: number): string {
  if (guessCount === 1) return "Local legend!";
  if (guessCount <= 2) return "Well done!";
  if (guessCount <= 3) return "Not bad!";
  if (guessCount === 5) return "Close one!";
  return "";
}

function getDirectionFromGuess(
  guess: string,
  suburbFeatures: Feature[] | undefined,
  correctSuburb: Feature | undefined,
): string {
  if (!suburbFeatures || !correctSuburb) return "???";
  const guessFeature = suburbFeatures.find(
    (f) => f.properties!.name.toLocaleUpperCase() === guess,
  );
  if (!guessFeature) return "???";
  const directionDecimalDegrees = bearing(
    centroid(guessFeature.geometry).geometry,
    centroid(correctSuburb.geometry).geometry,
  );
  return `${bearingToRoughDirection(directionDecimalDegrees)}`;
}

function bearingToRoughDirection(bearing: number) {
  // -180(n?) to 180(s?), positive clockwise

  if (bearing > -10 && bearing <= 10) return "N";
  if (bearing > 10 && bearing <= 55) return "NE";
  if (bearing > 55 && bearing <= 100) return "E";
  if (bearing > 100 && bearing <= 145) return "SE";
  if (bearing > 145 && bearing <= 190) return "S";
  if (bearing > -190 && bearing <= -125) return "SW";
  if (bearing > -125 && bearing <= -80) return "W";
  if (bearing > -80 && bearing <= -10) return "W";
  else return "???";
}

function Blank() {
  return <></>;
}

const ImgTile: TileComponent = ({ tile, tileLoaded }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={tile.url}
    srcSet={tile.srcSet}
    width={tile.width}
    height={tile.height}
    loading={"lazy"}
    onLoad={tileLoaded}
    alt={""}
    style={{
      position: "absolute",
      left: tile.left,
      top: tile.top,
      willChange: "transform",
      transformOrigin: "top left",
      opacity: 1,
    }}
  />
);

//TODO:
// Hints
// 1 - show map (?)
// 2 - amount of vowels?
// 3 - amount of letters?
//
// distance?
// wikipedia exerpt? (https://stackoverflow.com/questions/63345469/how-to-get-wikipedia-content-using-wikipedias-url)
// copy text to clipboard
