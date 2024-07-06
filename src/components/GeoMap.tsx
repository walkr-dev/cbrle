import React, { useEffect, useState } from "react";
import {
  GeoJson,
  GeoJsonLoader,
  Map,
  Marker,
  TileComponent,
} from "pigeon-maps";
import { Feature, FeatureCollection } from "geojson";

export function GeoMap() {
  const [solved, setSolved] = useState(false);

  const [allGeoJsonData, setGeoJsonData] = useState<
    FeatureCollection | undefined
  >(undefined);

  useEffect(() => {
    fetch("/Suburbs.geojson")
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setGeoJsonData(data);
      });
  }, []);

  return (
    <div className="mapDiv" style={{width: "100%", height: "100%"}}>
      <input type="button" title="Solve!" onClick={() => setSolved(true)} />
        <Map
          tileComponent={solved ? ImgTile : Blank}
          height={"80vh"}
          defaultCenter={[-35.28, 149.128998]}
          defaultZoom={11}
          mouseEvents={false}
          touchEvents={false}
        >
          {allGeoJsonData && (
            <GeoJson
              data={allGeoJsonData}
              styleCallback={(feature, hover) =>
                hover
                  ? { fill: "#93c0d099", strokeWidth: "2" }
                  : { fill: "#d4e6ec99", strokeWidth: "1" }
              }
            />
          )}
        </Map>
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
