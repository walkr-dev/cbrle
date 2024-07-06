import { centroid } from "@turf/turf";
import { Feature, FeatureCollection, Geometry, Position } from "geojson";
import {
  GeoJson,
  Map,
  TileComponent
} from "pigeon-maps";
import { useEffect, useMemo, useState } from "react";
import { Input } from "./components/ui/input";
import { ScrollArea } from "@radix-ui/react-scroll-area";

type Suburb = {
  name: string,
  geometry: Geometry,
  center: Position
}

export function GeoMap() {
  const [showFullMap, setShowFullMap] = useState(true);

  const [allGeoJsonData, setGeoJsonData] = useState<FeatureCollection | undefined>(undefined);
  const [suburbToGuess, setSuburbToGuess] = useState<FeatureCollection | undefined>(undefined);

  const [inputSuburb, setInputSuburb] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const suburbToGuessCentroid = useMemo(() => {
    let pos;
    if (suburbToGuess && suburbToGuess.features.length > 0) {
      pos = centroid(suburbToGuess.features[0].geometry).geometry.coordinates
      return [pos[1], pos[0]];
    }
    else{
      return [-35.28, 149.128998];
    }
  },[suburbToGuess]);

  const allSuburbs = useMemo(() => allGeoJsonData?.features.map(s => s.properties!.name), [allGeoJsonData]);

  const filteredSuburbs = useMemo(() => allSuburbs?.filter((s: string) => s.toLocaleLowerCase().includes(inputSuburb.toLocaleLowerCase())), [allSuburbs, inputSuburb]);

  function onKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      tryGuess(inputSuburb);
    }
  }

  function tryGuess(guess: string) {
    if (inputSuburb.toLocaleLowerCase() === suburbToGuess?.features[0].properties!.name.toLocaleLowerCase()) {
      console.log("you win!");
    }
    else {
      console.log(`wrong!, answer was ${suburbToGuess?.features[0].properties!.name.toLocaleLowerCase()}, input was ${inputSuburb.toLocaleLowerCase()}`);
    }
  }

  useEffect(() => {
    fetch("/Suburbs.geojson")
      .then((response) => response.json())
      .then((data: FeatureCollection) => {
        setGeoJsonData(data);
        const selected = data.features.at(Math.floor(Math.random() * data.features.length -1));
        if (selected) {
          const featureCollection: FeatureCollection = {type: "FeatureCollection", features: [selected]}
          console.log(featureCollection);
          setSuburbToGuess(featureCollection);
        }

      });
  }, []);

  return (
    <>
    <Input className="m-2" value={inputSuburb} onFocus={(e) => setInputFocused(true)} onBlur={(e) => setInputFocused(false)} onChange={(e) => setInputSuburb(e.target.value)} onKeyDown={(e) => onKeyPress(e)} />
    {inputSuburb.length > 1 && <ScrollArea className="h-12 w-full m-2">
      <div className="p-4">
      {filteredSuburbs && filteredSuburbs?.map(s => <div className="p-1 hover" key={s}>{s}</div>)}
      </div>
    </ScrollArea>}
    <div className="mapDiv" style={{width: "100%", height: "100%"}}>
        {allGeoJsonData && suburbToGuess && <Map
          tileComponent={showFullMap ? ImgTile : Blank}
          height={"60vh"}
          center={[suburbToGuessCentroid[0], suburbToGuessCentroid[1]]}
          defaultZoom={14}
          zoom={14}
          mouseEvents={false}
          touchEvents={false}
        >
            <GeoJson
              data={suburbToGuess}
              styleCallback={(feature: Feature, hover: boolean) => 
                hover
                  ? { fill: "#00a2c9", strokeWidth: "4", stroke: "white", strokeDasharray: "5, 5"}
                  : { fill: "#00ceff", strokeWidth: "4", stroke: "white", strokeDasharray: "5, 5"}
              }
            />
        </Map>}
    </div>
    </>
  );
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
