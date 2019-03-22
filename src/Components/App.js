import React, { useState, useEffect } from 'react';
import './App.css';
import AircraftsList from './AircraftsList';
import FlightsList from './FlightsList';
import RotationColumn from './RotationColumn';
import Calendar from './Calendar';

const typeFlight = 'Flight';
const typeTurnaround = 'Turnaround';
const turnaroundTime = 2400;
const totalDayTime = 86400;

const timeSort = (a, b) => a.start - b.start;
const flightsSort = (a, b) => {
  const value = a.departuretime - b.departuretime;
  return value === 0 ? a.arrivaltime - b.arrivaltime : value;
};

const calcPercentage = (current, total) => (100 * current) / total;

const turnaroundPercentage = calcPercentage(turnaroundTime, totalDayTime);

const usagePercentage = scheduledTime =>
  scheduledTime.reduce((acc, val) => acc + val.percentage, 0);

const App = () => {
  const [aircrafts, setAircrafts] = useState([]);
  const [flights, setFlights] = useState([]);
  const [rotations, setRotations] = useState({});
  const [selectedAircraft, setSelectedAircraft] = useState('');
  const [usageList, setUsageList] = useState({});

  const fetchData = async (value, callback, sorter) => {
    const res = await fetch(value);
    const body = await res.json();
    const { data } = body;
    const response = data || body;
    if (sorter) {
      response.sort(sorter);
    }
    callback(response);
  };

  useEffect(() => {
    fetchData(
      'https://infinite-dawn-93085.herokuapp.com/aircrafts',
      setAircrafts,
    );
  }, []);

  const makeNewRotation = aircraft => {
    const newRotations = {
      ...rotations,
      [aircraft]: {
        flights: [],
        scheduledTime: [],
      },
    };
    setRotations(newRotations);
  };

  const onAircraftClick = aircraft => {
    // In a real case scenario this would accept a value to fetch data based on the aircraft
    fetchData(
      'https://gist.githubusercontent.com/nickbnf/77dcd76a26c57fa0d005187b6808799e/raw/7db99dd58cabbcdd25c65ea974a19df4f404b8e4/flights.json',
      setFlights,
      flightsSort,
    );
    setSelectedAircraft(aircraft);
    if (!rotations[aircraft]) {
      makeNewRotation(aircraft);
    }
  };

  const onFlightClick = target => {
    const {
      flights: aircraftFlights,
      scheduledTime: aircraftScheduledTime,
    } = rotations[selectedAircraft];
    const newRotationFlights = aircraftFlights
      ? [...aircraftFlights, target].sort(flightsSort)
      : [target];
    const { ident, departuretime, arrivaltime, destination } = target;
    const formattedSchedule = {
      id: ident,
      type: typeFlight,
      start: departuretime,
      end: arrivaltime,
      percentage: calcPercentage(arrivaltime - departuretime, totalDayTime),
    };
    const startTurnaroundTime = formattedSchedule.end + 1;
    const endTurnaroundTime = formattedSchedule.end + turnaroundTime;
    const turnaroundObj = {
      id: ident,
      type: typeTurnaround,
      start:
        startTurnaroundTime <= totalDayTime
          ? startTurnaroundTime
          : totalDayTime,
      end: endTurnaroundTime <= totalDayTime ? endTurnaroundTime : totalDayTime,
      origin: destination,
      percentage: turnaroundPercentage,
    };
    const newScheduledTime = [
      ...aircraftScheduledTime,
      formattedSchedule,
      turnaroundObj,
    ].sort(timeSort);
    const currentPercentage = usagePercentage(newScheduledTime);
    const newUsageList = {
      ...usageList,
      [selectedAircraft]: currentPercentage,
    };
    setUsageList(newUsageList);
    const newAircraftRotation = {
      ...rotations[selectedAircraft],
      flights: newRotationFlights,
      scheduledTime: newScheduledTime,
    };
    const newRotation = {
      ...rotations,
      [selectedAircraft]: newAircraftRotation,
    };
    setRotations(newRotation);
  };

  const onRotationClick = target => {
    const {
      flights: aircraftFlights,
      scheduledTime: aircraftScheduledTime,
    } = rotations[selectedAircraft];
    const aircraftFlightIndex = aircraftFlights.findIndex(el => el === target);
    const newAircraftFlights = aircraftFlights.splice(0, aircraftFlightIndex);
    const scheduledTimeIndex = aircraftScheduledTime.findIndex(
      el => el.id === target.ident,
    );
    const newScheduledTime = aircraftScheduledTime.splice(
      0,
      scheduledTimeIndex,
    );
    const currentPercentage = usagePercentage(newScheduledTime);
    const newUsageList = {
      ...usageList,
      [selectedAircraft]: currentPercentage,
    };
    setUsageList(newUsageList);
    const newAircraftRotation = {
      ...rotations[selectedAircraft],
      flights: newAircraftFlights,
      scheduledTime: newScheduledTime,
    };
    const newRotation = {
      ...rotations,
      [selectedAircraft]: newAircraftRotation,
    };
    setRotations(newRotation);
  };

  const filterFlights = () => {
    const curRot = rotations[selectedAircraft];
    if (!curRot || !curRot.flights.length) {
      return flights;
    }
    const canBeScheduled = flight => {
      const lastIndex = curRot.scheduledTime.length - 1;
      const { origin, end } = curRot.scheduledTime[lastIndex];
      return (
        (!origin || origin === flight.origin) && flight.departuretime >= end
      );
    };
    return flights.filter(flight => {
      return !curRot.flights.includes(flight) && canBeScheduled(flight);
    });
  };

  return (
    <div className="App">
      <Calendar />
      <AircraftsList
        className="sideListLeft"
        list={aircrafts}
        onElementClick={onAircraftClick}
        usageList={usageList}
      />
      <RotationColumn
        list={rotations[selectedAircraft] || []}
        onElementClick={onRotationClick}
      />
      <FlightsList
        className="sideListRight"
        list={filterFlights()}
        onElementClick={onFlightClick}
      />
    </div>
  );
};

export default App;
