import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Button, Text, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";
import { GOOGLE_API_KEY } from "@env";

export default function App() {
  const [view, setView] = useState("map");
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    //loadFavorites();
    removeAllFavorites();

    if (view === "map" || view === "list") {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Permission to access location was denied");
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
      })();
    }

    if (view === "list" && location) {
      fetchHistoricPlaces();
    }
  }, [view, location]);

  const fetchHistoricPlaces = async () => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=5000&type=point_of_interest&keyword=historic&key=${GOOGLE_API_KEY}`
      );

      setPlaces(response.data.results);
    } catch (error) {
      console.error(error);
    }
  };

  const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => (x * Math.PI) / 180;

    const lat1 = coords1.latitude;
    const lon1 = coords1.longitude;
    const lat2 = coords2.latitude;
    const lon2 = coords2.longitude;

    const R = 6371e3; // Earth radius in meters
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in meters
    return distance;
  };

  const saveFavorite = async (place) => {
    try {
      const updatedFavorites = [...favorites, place];
      setFavorites(updatedFavorites);
      await AsyncStorage.setItem(
        "@favorites",
        JSON.stringify(updatedFavorites)
      );
    } catch (error) {
      console.error(error);
    }
  };

  const loadFavorites = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("@favorites");
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const removeFavorite = async (placeId) => {
    try {
      const updatedFavorites = favorites.filter(
        (place) => place.place_id !== placeId
      );
      setFavorites(updatedFavorites);
      await AsyncStorage.setItem(
        "@favorites",
        JSON.stringify(updatedFavorites)
      );
    } catch (error) {
      console.error("Error al eliminar favorito:", error);
    }
  };

  const removeAllFavorites = async () => {
    try {
      setFavorites([]);
      await AsyncStorage.removeItem("@favorites");
    } catch (error) {
      console.error("Error al eliminar todos los favoritos:", error);
    }
  };

  const recenterMap = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  const renderView = () => {
    if (view === "map" && location) {
      return (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={"Tu Ubicación"}
            />
            <Circle
              center={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              radius={50}
              strokeColor="rgba(0, 122, 255, 0.5)"
              fillColor="rgba(0, 122, 255, 0.2)"
            />
            {places.map((place, index) => (
              <Marker
                key={`${place.place_id}_${index}`}
                coordinate={{
                  latitude: place.geometry.location.lat,
                  longitude: place.geometry.location.lng,
                }}
                title={place.name}
                description={place.vicinity}
              />
            ))}
          </MapView>
          <TouchableOpacity style={styles.recenterButton} onPress={recenterMap}>
            <Text style={styles.recenterText}>Centrar</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (view === "list") {
      return (
        <View style={styles.listContainer}>
          {places.map((place) => (
            <TouchableOpacity
              key={place.place_id}
              onPress={() => saveFavorite(place)}
            >
              <Text style={styles.listItem}>{place.name}</Text>
              <Text>{place.vicinity}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    } else if (view === "details") {
      return (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Lugar Histórico</Text>
          <Text>Descripción detallada del lugar histórico.</Text>
        </View>
      );
    } else if (view === "favorites") {
      return (
        <View style={styles.listContainer}>
          {favorites.map((place) => (
            <Text key={place.place_id} style={styles.listItem}>
              {place.name}
            </Text>
          ))}
        </View>
      );
    } else {
      return <Text>Cargando...</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Mapa" onPress={() => setView("map")} />
        <Button title="Lista" onPress={() => setView("list")} />
        <Button title="Favoritos" onPress={() => setView("favorites")} />
      </View>
      {renderView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 40,
  },
  listContainer: {
    padding: 20,
  },
  listItem: {
    fontSize: 18,
    paddingVertical: 10,
  },
  detailsContainer: {
    padding: 20,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  recenterButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  recenterText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
});
