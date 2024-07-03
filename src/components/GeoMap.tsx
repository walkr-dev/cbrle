import React, { useState } from "react"
import { GeoJsonLoader, Map, Marker, TileComponent } from "pigeon-maps"

export function GeoMap() {
    const [solved, setSolved] = useState(false);

  return (
    <>
    <input type="button" title="Solve!" onClick={() => setSolved(true)}/>
    <Map tileComponent={solved ? ImgTile : Blank} height={600} defaultCenter={[-35.28, 149.128998]} defaultZoom={11} mouseEvents={false} touchEvents={false}>
    <GeoJsonLoader
        link={"/Suburbs.geojson"}
        styleCallback={(feature, hover) =>
          hover
            ? { fill: '#93c0d099', strokeWidth: '2'}
            : { fill: '#d4e6ec99', strokeWidth: '1'}
        }
      />
    </Map>
    </>
  )
}

function Blank() {
    return (<></>)
}

const ImgTile: TileComponent = ({ tile, tileLoaded }) => (
    <img
      src={tile.url}
      srcSet={tile.srcSet}
      width={tile.width}
      height={tile.height}
      loading={'lazy'}
      onLoad={tileLoaded}
      alt={''}
      style={{
        position: 'absolute',
        left: tile.left,
        top: tile.top,
        willChange: 'transform',
        transformOrigin: 'top left',
        opacity: 1,
      }}
    />
  )