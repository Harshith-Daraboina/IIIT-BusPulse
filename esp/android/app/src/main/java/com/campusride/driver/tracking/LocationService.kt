package com.campusride.driver.tracking

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.campusride.driver.DriverApplication
import com.campusride.driver.MainActivity
import com.campusride.driver.data.LocationRequest as LocationPayload
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import retrofit2.HttpException
import java.time.Instant

object TrackingState {
    private val mutable = MutableStateFlow("Not tracking")
    val status = mutable.asStateFlow()
    fun update(message: String) { mutable.value = message }
}

class LocationService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fused: FusedLocationProviderClient
    @Volatile private var latest: Location? = null
    private var job: Job? = null
    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) { latest = result.lastLocation }
    }
    override fun onCreate() {
        super.onCreate()
        fused = LocationServices.getFusedLocationProviderClient(this)
        getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("tracking", "Active bus trip", NotificationManager.IMPORTANCE_LOW))
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val busId = intent?.getStringExtra("busId")
        if (busId.isNullOrBlank() || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            TrackingState.update("Location permission required"); stopSelf(); return START_NOT_STICKY
        }
        val openApp = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = NotificationCompat.Builder(this, "tracking").setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("IIIT BusPulse: trip active").setContentText("Sharing bus location. Open the app to stop your trip.")
            .setContentIntent(openApp).setOngoing(true).build()
        startForeground(1001, notification)
        if (job?.isActive == true) return START_NOT_STICKY
        try {
            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000).setMinUpdateIntervalMillis(5000).setMaxUpdateDelayMillis(5000).build()
            fused.requestLocationUpdates(request, callback, Looper.getMainLooper())
                .addOnFailureListener { TrackingState.update("Could not start GPS: ${it.message}"); stopSelf() }
        } catch (_: SecurityException) { TrackingState.update("Location permission revoked"); stopSelf(); return START_NOT_STICKY }
        TrackingState.update("Waiting for GPS fix")
        val repository = (application as DriverApplication).repository
        job = scope.launch {
            var failures = 0
            while (isActive) {
                val location = latest
                if (location != null && System.currentTimeMillis() - location.time in 0..30000 && location.accuracy <= 100) {
                    try {
                        // Never replay stale GPS fixes after an outage; the server also checks timestamps.
                        val response = repository.api.location(LocationPayload(busId, location.latitude, location.longitude,
                            (location.speed * 3.6).coerceIn(0.0, 160.0), location.bearing.toDouble().coerceIn(0.0, 360.0), Instant.ofEpochMilli(location.time).toString()))
                        failures = 0
                        TrackingState.update(if (response.accepted) "GPS connected · ${Instant.ofEpochMilli(location.time)}" else "Waiting for a newer GPS fix")
                    } catch (error: CancellationException) { throw error }
                    catch (error: HttpException) {
                        if (error.code() == 401 || error.code() == 403) { repository.tokens.clear(); TrackingState.update("Session expired. Sign in again."); stopSelf(); break }
                        if (error.code() == 409) {
                            val assignment = runCatching { repository.api.assignment() }.getOrNull()
                            if (assignment != null && assignment.trip == null) { TrackingState.update("Trip ended by server"); stopSelf(); break }
                        }
                        failures++; TrackingState.update("Connection interrupted. Retrying…")
                    } catch (_: Exception) { failures++; TrackingState.update("Offline. Waiting for connection…") }
                } else TrackingState.update("Waiting for an accurate GPS fix")
                delay(if (failures == 0) 5000L else (5000L * (1L shl failures.coerceAtMost(3))).coerceAtMost(30000L))
            }
        }
        return START_NOT_STICKY
    }
    override fun onDestroy() { fused.removeLocationUpdates(callback); scope.cancel(); super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
}