import { bearing, centroid, distance } from "@turf/turf";
import { Feature, FeatureCollection } from "geojson";
import {
  GeoJson,
  Map,
  TileComponent
} from "pigeon-maps";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { guessList } from "./List";

export function GeoMap() {

  //data
  const [allGeoJsonData, setGeoJsonData] = useState<Feature[] | undefined>(undefined);
  const [suburbToGuess, setSuburbToGuess] = useState<Feature | undefined>(undefined);

  const suburbToGuessCentroid = useMemo(() => {
    let pos;
    if (suburbToGuess) {
      pos = centroid(suburbToGuess.geometry).geometry.coordinates
      return [pos[1], pos[0]];
    }
    else {
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

  const allSuburbs = useMemo(() => allGeoJsonData?.map(s => s.properties!.name), [allGeoJsonData]);
  const filteredSuburbs = useMemo(() => {
      if (inputSuburb.length === 0) return [];
      return allSuburbs?.filter((s: string) => s.toLocaleUpperCase().includes(inputSuburb.toLocaleUpperCase()))
    },
    [allSuburbs, inputSuburb]
  );


  useEffect(() => {
    fetch("/Suburbs.geojson")
      .then((response) => response.json())
      .then((data: FeatureCollection) => {
        setGeoJsonData(data.features);
        const selected = data.features.find(f => getTodaysGuessFromList(guessList) === f.properties!.name);
        if (selected) {
          setSuburbToGuess(selected);
        }

      });
  }, []);

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

    if (!allSuburbs?.map(a => a.toLocaleUpperCase()).includes(guess)) {
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
    }
    else {
      if (currentGuesses.length >= MAX_GUESSES) {
        onLose();
      }
    }

  }

  function onWin() {
    setHasWon(true);
  }

  function onLose() {
    setHasLost(true);
    // show what correct answer was
  }

  function getTodaysGuessFromList(list: string[]) {
    const today = new Date();
    const startDate = new Date(2024, 6, 10);

    const timeDifference = today.getTime() - startDate.getTime();
    const daysSinceStart = Math.floor(timeDifference / (1000 * 3600 * 24));

    return list[daysSinceStart % list.length];
  }

  return (
    <>
      {!won && !lost && <div>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input placeholder="Guess..." value={inputSuburb} onChange={(e) => setInputSuburb(e.target.value)} onKeyDown={(e) => onKeyPress(e)} />
          <Button onClick={() => tryGuess(inputSuburb)}>Guess {guesses.length} / {MAX_GUESSES}</Button>
        </div>
        {inputSuburb.length > 0 && <ScrollArea className="h-20 mb-2 w-full">
          {filteredSuburbs && filteredSuburbs?.map(s => <div className="p-2 transition-colors hover:bg-slate-200" onClick={() => tryGuess(s)} key={s}>{s}</div>)}
        </ScrollArea>}
      </div>}

      <div className="my-2">
        {guesses.map((g, index) => 
          <div key={index}>{isCorrectGuess(g, suburbToGuess?.properties!.name) ? "✅" : "❌"} {g} {getDistanceFromGuess(g, allGeoJsonData, suburbToGuess).toFixed(2)}km, {getDirectionFromGuess(g, allGeoJsonData, suburbToGuess)}</div>
        )}
      </div>

      {won && <div>Won in {guesses.length} guesses!</div>}

      {lost && <div>Lost! It was: {suburbToGuess?.properties!.name}</div>}

      <div className="mapDiv" style={{ width: "100%", height: "100%" }}>
        {allGeoJsonData && suburbToGuess && <Map
          tileComponent={showFullMap ? ImgTile : Blank}
          /* this is dumb, looks like you can actually inline a string here in pigeon-maps...
          // @ts-ignore */
          height={"55vh"}
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
                ? { fill: "#00ceff", strokeWidth: "4", stroke: "white", strokeDasharray: "5, 5" }
                : { fill: "#00c9f9", strokeWidth: "4", stroke: "white", strokeDasharray: "5, 5" }
            }
          />
        </Map>}
      </div>
    </>
  );
}

function toFeatureCollection(feature: Feature): FeatureCollection {
  return ({ type: "FeatureCollection", features: [feature] })
}

function getDistanceFromGuess(guess: string, suburbFeatures: Feature[] | undefined, correctSuburb: Feature | undefined): number {
  if (!suburbFeatures || !correctSuburb) return -1;
  const guessFeature = suburbFeatures.find(f => f.properties!.name.toLocaleUpperCase() === guess);
  if (!guessFeature) return -1;
  return distance(centroid(correctSuburb.geometry).geometry, centroid(guessFeature.geometry).geometry);
}

function getDirectionFromGuess(guess: string, suburbFeatures: Feature[] | undefined, correctSuburb: Feature | undefined): string {
  if (!suburbFeatures || !correctSuburb) return "???";
  const guessFeature = suburbFeatures.find(f => f.properties!.name.toLocaleUpperCase() === guess);
  if (!guessFeature) return "???";
  const directionDecimalDegrees = bearing(centroid(guessFeature.geometry).geometry, centroid(correctSuburb.geometry).geometry);
  return `${bearingToRoughDirection(directionDecimalDegrees)}`;
}

function bearingToRoughDirection(bearing: number) {
  // -180(n?) to 180(s?), positive clockwise

  if (bearing > -10 && bearing <= 10) return "N"
  if (bearing > 10 && bearing <= 55) return "NE"
  if (bearing > 55 && bearing <= 100) return "E"
  if (bearing > 100 && bearing <= 145) return "SE"
  if (bearing > 145 && bearing <= 190) return "S"
  if (bearing > -190 && bearing <= -125) return "SW"
  if (bearing > -125 && bearing <= -80) return "W"
  if (bearing > -80 && bearing <= -10) return "W"

  else return "???"
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
// Only one per day (set up a list?)
// win display
// loss display
// copy text to clipboard