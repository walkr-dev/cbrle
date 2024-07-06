import { centroid } from "@turf/turf";
import { Feature, FeatureCollection, Geometry, Position } from "geojson";
import {
  GeoJson,
  Map,
  TileComponent
} from "pigeon-maps";
import { useEffect, useMemo, useState } from "react";

type Suburb = {
  name: string,
  geometry: Geometry,
  center: Position
}

export function GeoMap() {
  const [showFullMap, setShowFullMap] = useState(true);

  const [allGeoJsonData, setGeoJsonData] = useState<FeatureCollection | undefined>(undefined);
  const [suburbToGuess, setSuburbToGuess] = useState<FeatureCollection | undefined>(undefined);

  const suburbToGuessCentroid = useMemo(() => {
    let pos;
    if (suburbToGuess && suburbToGuess.features.length > 0) {
      pos = centroid(suburbToGuess.features[0].geometry).geometry.coordinates
      return [pos[1], pos[0]];
    }
    else{
      return [-35.28, 149.128998];
    }
  },[suburbToGuess])

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
    <div className="mapDiv" style={{width: "100%", height: "100%"}}>
        {allGeoJsonData && suburbToGuess && <Map
          tileComponent={showFullMap ? ImgTile : Blank}
          height={"80vh"}
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
