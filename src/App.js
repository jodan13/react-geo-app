import React, { useState, useEffect, useRef, useCallback } from "react";

import OlMap from "ol/Map";
import OlView from "ol/View";
import OlLayerTile from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from 'ol/source/Vector';
import OlSourceOsm from "ol/source/OSM";
import OlStyle from "ol/style/Style";
import OlStyleIcon from "ol/style/Icon";
import MapUtil from '@terrestris/ol-util/dist/MapUtil/MapUtil'
import {click} from 'ol/events/condition';
import Select from 'ol/interaction/Select';
import Overlay from 'ol/Overlay';
import SVG from 'react-inlinesvg';

import { MousePosition, defaults as DefaultControls } from "ol/control";
import { createStringXY } from "ol/coordinate";
import {
   Drawer, 
   Modal, 
   Button, 
   Input, 
   Icon,
   Checkbox,
   Slider
  } from "antd";
  import Highlighter from 'react-highlight-words';
 
import mapMarkerChecked from "./img/comment-checked.svg";
import mapMarkerDelete from "./img/comment-delete.svg";
import mapMarkerText from "./img/comment-text.svg";

import {
  SimpleButton,
  MapComponent,
  MapProvider,
  MeasureButton,
  DigitizeButton,
  ToggleGroup,
  FeatureGrid,
  LayerSwitcher,
  mappify
} from "@terrestris/react-geo";

import "./App.css";
import "ol/ol.css";
import "antd/dist/antd.css";
import "./react-geo.css";

const Map = mappify(MapComponent);

const center = [4420570.3290049005, 5981353.3434550995];
const layers = [
  new OlLayerTile({
    source: new OlSourceOsm(),
    name: "ВКЛЮЧИТЬ КАРТУ"
  }),
  new VectorLayer({
    source: new VectorSource(),
    name: "ВЫКЛЮЧИТЬ КАРТУ"
  })
];

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(4),
  projection: "EPSG:4326",
  className: "custom-mouse-position",
  target: document.getElementById("mouse-position"),
  undefinedHTML: "&nbsp;"
});
const map = new OlMap({
  view: new OlView({
    center: center,
    zoom: 16,
    maxZoom: 17,
    minZoom: 1
  }),
  layers: layers,
  controls: DefaultControls().extend([mousePositionControl])
});

var overlay = new Overlay({
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

const select = new Select({
  condition: click
});

map.removeInteraction(select);
map.addInteraction(select);

function App() {
  const [visible, setVisible] = useState(false);
  const [visibleModal, setVisibleModal] = useState(false);
  const [visiblePopap, setVisiblePopap] = useState(false);
  const [loading] = useState(false); 
  const [features, setFeatures] = useState([]);
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [popapContent, setPopapContent] = useState({title:'', description:''})
  const [olUid, setOlUid] = useState(0)
  const [toggleGroup, setToggleGroup] = useState(true)
  const [itemFeatures, setItemFeatures] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [digitizeLayerName, setDigitizeLayerName] = useState("mapMarkerText")
  const [imageScaleText, setImageScaleText] = useState(false)
  const [imageScaleDelete, setImageScaleDelete] = useState(false)
  const [imageScaleChecked, setImageScaleChecked] = useState(false)
  const [inputValueText, setInputValueText] = useState(1)
  const [inputValueDelete, setInputValueDelete] = useState(1)
  const [inputValueChecked, setInputValueChecked] = useState(1)

  const container = useRef(null); 
  const searchInput = useRef(null); 

  const toggleDrawer = () => {
    setVisible(!visible);
  };
  const iconStyleFunc = useCallback(
    (name=digitizeLayerName, src=mapMarkerText, val=inputValueText) => {
      const iconStyle = new OlStyle({
        image: new OlStyleIcon({
          anchor: [0.5, 24],
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          src: src
        })
      })
      MapUtil.getLayerByName(map, name).setStyle(function(feature, resolution) {
        iconStyle.getImage().setScale(1/Math.pow(resolution, 1/val));
        return iconStyle;
      });
    },
    [digitizeLayerName,inputValueText],
  );

  useEffect(()=>{
    if(imageScaleText){
      iconStyleFunc("mapMarkerText",mapMarkerText,inputValueText)
    }
    if(imageScaleDelete){
      iconStyleFunc("mapMarkerDelete",mapMarkerDelete,inputValueDelete)
    }
    if(imageScaleChecked){
      iconStyleFunc("mapMarkerChecked",mapMarkerChecked,inputValueChecked)
    }
  },[
    iconStyleFunc,
    imageScaleText,
    imageScaleChecked,
    imageScaleDelete,
    inputValueChecked,
    inputValueText,
    inputValueDelete,
  ])

  useEffect(()=>{
    overlay.setElement(container.current)
    map.addOverlay(overlay);
    select.on('select', (e) => {
      if (e.selected.length && toggleGroup){
          setPopapContent({
            title: e.selected[0].values_.title, 
            description: e.selected[0].values_.description,
          })
        var coordinate = e.selected[0].values_.geometry.flatCoordinates;
        overlay.setPosition(coordinate);
        MapUtil.zoomToFeatures(map, e.selected)
      }
      if (!toggleGroup && e.selected.length){
        setVisiblePopap(true)
      } else if (!e.selected.length && toggleGroup){
        setVisiblePopap(false)
      }

    });
  }, [visibleModal, toggleGroup])

  const modalOk = () => {
    setVisibleModal(false)
    itemFeatures.setProperties({title, description, digitizeLayerName})
    itemFeatures.setId(olUid)
    console.log("itemFeatures", itemFeatures)
    setFeatures([...features, itemFeatures])
  }
  const getSource = (val=digitizeLayerName) => {
    const drawLayer = MapUtil.getLayerByName(map, val)
    const source = drawLayer.getSource()
    return source;
  }
  const modalCancel = () => {
    getSource().removeFeature(itemFeatures)
    setVisibleModal(false)
  }

  const handleSearch = (selectedKeys, confirm) => {
    confirm();
    setSearchText(selectedKeys[0])
  };

  const handleReset = clearFilters => {
    clearFilters();
    setSearchText('');
  };      
  const iconData =[
    {
      name: "mapMarkerChecked", 
      icon: mapMarkerChecked, 
      inputValue: inputValueChecked,
      setInputValue: (val)=>setInputValueChecked(val),
      setImageScale: (e)=>setImageScaleChecked(e.target.checked)
    },
    {
      name: "mapMarkerDelete", 
      icon: mapMarkerDelete, 
      inputValue: inputValueDelete,
      setInputValue: (val)=>setInputValueDelete(val),
      setImageScale: (e)=>setImageScaleDelete(e.target.checked)
    },
    {
      name: "mapMarkerText", 
      icon: mapMarkerText, 
      inputValue: inputValueText,
      setInputValue: (val)=>setInputValueText(val),
      setImageScale: (e)=>setImageScaleText(e.target.checked)
    }
  ]
  return (
    <div className="App">
      <MapProvider map={map}>
      <Map />
      <div  ref={container}>
        {visiblePopap && toggleGroup && (
          <div id="popup" className="ol-popup">
            <div 
              onClick={()=>{setVisiblePopap(false)}} 
              className="ol-popup-closer"
            ></div>
            <div id="popup-content">
              <p><b>Title:{popapContent.title}</b></p>
              <p>Desc:{popapContent.description}</p>
            </div>
          </div>
        )}
      </div>
      <SimpleButton
        style={{ 
          position: "fixed", 
          top: "30px", 
          right: "30px" 
        }}
        onClick={toggleDrawer}
        icon="bars"
      />
      <LayerSwitcher
        style={{
          position: "absolute",
          backgroundColor: "#1890FF",
          color: "#fff",
          width: "90px",
          textAlign: "center",
          bottom: 0,
          left: "10px",
          zIndex: 2,
          cursor: "pointer"
        }}
        map={map}
        layers={layers}
      />
      <Drawer
        width="300"
        title="react-geo-application"
        placement="right"
        onClose={toggleDrawer}
        visible={visible}
        mask={false}
      >
        <ToggleGroup 
          onChange={(e)=>{
            setToggleGroup(e.pressed); 
            setVisiblePopap(false)
          }}
        >
        <MeasureButton
          key="measureButton"
          name="steps"
          map={map}
          measureType="line"
          icon="pencil"
          showMeasureInfoOnClickedPoints
        >
          Измерения расстояния
        </MeasureButton>
        <MeasureButton
          key="measureButton2"
          map={map}
          measureType="polygon"
          icon="pencil"
          name="poly"
        >
          Измерения площади
        </MeasureButton>
          {iconData.map((item,index)=>(
            <DigitizeButton
              name={item.name}
              key={index}
              map={map}
              digitizeLayerName={item.name}
              drawType="Point"
              drawStyle={
                new OlStyle({
                  image: new OlStyleIcon({
                    anchor: [0.5, 24],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    src: item.icon
                  })
                })
              }
              onDrawStart={
                (evt)=>{
                  setDigitizeLayerName(item.name)
                  setVisibleModal(true)
                  setItemFeatures(evt.feature)
                  setOlUid(evt.feature.ol_uid)
                }
              }
            >
            <SVG src={item.icon} /> Добавить точку
            </DigitizeButton>
          )
          )}
        </ToggleGroup>
        {iconData.map((item,index)=>(
            <div key={index}>
            <SVG src={item.icon} />
            <Checkbox onChange={item.setImageScale}>включить масштаб иконки</Checkbox>
            <Slider
              min={0.5}
              max={10}
              step={0.5}
              onChange={item.setInputValue}
              value={typeof item.inputValue === 'number' ? item.inputValue : 0}
            />
            </div>
          )
          )}
        <FeatureGrid
          attributeBlacklist={['digitizeLayerName']}
          features={features}
          map={map}
          loading={loading}
          zoomToExtent={true}
          onRowClick={(e)=>{
            setPopapContent({
              title: e.title, 
              description: e.description,
            })
            const coordinate = getSource(e.digitizeLayerName).getFeatureById(e.key).values_.geometry.flatCoordinates;
            overlay.setPosition(coordinate);
            setVisiblePopap(true); 
          }}
          columnDefs={{
            'title': {
              title: 'title',
              sorter: (a, b) => {
                const nameA = a.title.toUpperCase();
                const nameB = b.title.toUpperCase();
                if (nameA < nameB) {
                  return -1;
                }
                if (nameA > nameB) {
                  return 1;
                }

                return 0;
              },
              defaultSortOrder: 'ascend',

                filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                  <div style={{ padding: 8 }}>
                    <Input
                      ref={searchInput}
                      placeholder="Search title"
                      value={selectedKeys[0]}
                      onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                      onPressEnter={() => handleSearch(selectedKeys, confirm)}
                      style={{ width: 188, marginBottom: 8, display: 'block' }}
                    />
                      <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys, confirm)}
                        icon="search"
                        size="small"
                        style={{ width: 90 }}
                      >
                        Search
                      </Button>
                      <Button onClick={() => handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Reset
                      </Button>
                  </div>
                ),
                filterIcon: filtered => <Icon type="search"  style={{ color: filtered ? '#1890ff' : undefined }} />,
                onFilter: (value, record) =>
                  record['title'].toString().toLowerCase().includes(value.toLowerCase()),
                onFilterDropdownVisibleChange: visible => {
                  if (visible) {
                    setTimeout(() => searchInput.current.select());
                  }
                },
                render: text => (
                    <Highlighter
                      highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                      searchWords={[searchText]}
                      autoEscape
                      textToHighlight={text.toString()}
                    />
                  )

            }
          }}
        />
      </Drawer>
      <Modal
        title={"id" + olUid}
        visible={visibleModal}
        onOk={modalOk}
        onCancel={modalCancel}
      >
        <div style={{ marginBottom: 16 }}>
        <Input 
          placeholder="Title" 
          name="title"
          value={title}
          onChange={(e)=>setTitle(e.target.value)} 
        />
        </div>
        <Input 
          placeholder="Description" 
          name="description"
          value={description}
          onChange={(e)=>setDescription(e.target.value)} 
        />
      </Modal>

      </MapProvider>
    </div>
  );
}

export default App;
