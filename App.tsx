import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Button,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";
import { GOOGLE_API_KEY } from "@env";
import Icon from "react-native-vector-icons/Ionicons";

export default function App() {
  const [view, setView] = useState("map");
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [targetLocation, setTargetLocation] = useState(null); // Nueva variable de estado
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadFavorites();

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

  // Efecto para centrar el mapa después de cambiar a la vista "map"
  useEffect(() => {
    if (view === "map" && targetLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        latitudeDelta: 0.005, // Más cercano
        longitudeDelta: 0.005, // Más cercano
      });
      setTargetLocation(null); // Reinicia el estado después de centrar el mapa
    }
  }, [view, targetLocation]);

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

  const goToLocation = (lat, lng) => {
    setTargetLocation({ latitude: lat, longitude: lng });
    setView("map");
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
        <ScrollView style={styles.listContainer}>
          {places.map((place) => (
            <View key={place.place_id} style={styles.listItemContainer}>
              <View style={styles.listItemTextContainer}>
                <Text style={styles.listItem}>{place.name}</Text>
                <Text>{place.vicinity}</Text>
              </View>
              <View style={styles.iconContainer}>
                <TouchableOpacity
                  onPress={() =>
                    goToLocation(
                      place.geometry.location.lat,
                      place.geometry.location.lng
                    )
                  }
                >
                  <Icon name="navigate" size={24} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => saveFavorite(place)}>
                  <Icon
                    name="heart-outline"
                    size={24}
                    color="#FF0000"
                    style={styles.iconMarginLeft}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
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
  listItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItem: {
    fontSize: 18,
    paddingVertical: 5,
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconMarginLeft: {
    marginLeft: 15,
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
