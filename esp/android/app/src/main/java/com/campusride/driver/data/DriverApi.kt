package com.campusride.driver.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class Stop(val id: String, val stopName: String, val latitude: Double?, val longitude: Double?, val sequenceNumber: Int)
data class BusRoute(val id: String, val name: String, val source: String, val destination: String, val stops: List<Stop>)
data class Bus(val id: String, val busNumber: String, val vehicleNumber: String, val route: BusRoute)
data class Driver(val id: String, val name: String)
data class Trip(val id: String, val status: String)
data class LoginRequest(val driverId: String, val password: String)
data class LoginResponse(val token: String, val expiresIn: Int, val driver: Driver, val bus: Bus?)
data class AssignmentResponse(val bus: Bus?, val trip: Trip?)
data class TripRequest(val busId: String)
data class TripResponse(val trip: Trip)
data class Success(val success: Boolean)
data class LocationRequest(val busId: String, val latitude: Double, val longitude: Double, val speed: Double, val heading: Double, val timestamp: String)
data class LocationResponse(val accepted: Boolean, val reason: String?)

interface DriverApi {
    @POST("api/driver/login") suspend fun login(@Body request: LoginRequest): LoginResponse
    @GET("api/driver/assignment") suspend fun assignment(): AssignmentResponse
    @POST("api/trips/start") suspend fun start(@Body request: TripRequest): TripResponse
    @POST("api/trips/stop") suspend fun stop(@Body request: TripRequest): Success
    @POST("api/location") suspend fun location(@Body request: LocationRequest): LocationResponse
}