package com.campus.maintenance.repository;

import com.campus.maintenance.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LocationRepository extends JpaRepository<Location, Long> {

    List<Location> findByBuildingName(String buildingName);

    List<Location> findByIsActiveTrue();
}
