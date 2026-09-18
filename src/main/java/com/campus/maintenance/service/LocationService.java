package com.campus.maintenance.service;

import com.campus.maintenance.entity.Location;
import com.campus.maintenance.repository.LocationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationService {

    private final LocationRepository locationRepository;

    public LocationService(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    public List<Location> getAllLocations() {
        return locationRepository.findAll();
    }

    public List<Location> getActiveLocations() {
        return locationRepository.findByIsActiveTrue();
    }

    public Location getLocationById(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found"));
    }

    public Location createLocation(Location location) {
        return locationRepository.save(location);
    }

    public Location updateLocation(Long id, Location updatedLocation) {
        Location location = getLocationById(id);
        location.setBuildingName(updatedLocation.getBuildingName());
        location.setFloor(updatedLocation.getFloor());
        location.setRoomNumber(updatedLocation.getRoomNumber());
        location.setDescription(updatedLocation.getDescription());
        location.setIsActive(updatedLocation.getIsActive());
        return locationRepository.save(location);
    }

    public void deleteLocation(Long id) {
        getLocationById(id);
        locationRepository.deleteById(id);
    }
}
