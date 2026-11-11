package com.campusride.driver.ui

import android.app.Application
import android.content.Intent
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.campusride.driver.DriverApplication
import com.campusride.driver.data.Bus
import com.campusride.driver.data.TripRequest
import com.campusride.driver.tracking.LocationService
import com.campusride.driver.tracking.TrackingState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException

data class DriverUiState(val signedIn: Boolean = false, val bus: Bus? = null, val active: Boolean = false, val busy: Boolean = false, val error: String? = null)
class DriverViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = (application as DriverApplication).repository
    private val mutable = MutableStateFlow(DriverUiState())
    val state = mutable.asStateFlow()
    init { if (repository.tokens.read() != null) refresh() }
    private fun run(action: suspend () -> Unit) {
        viewModelScope.launch {
            mutable.value = mutable.value.copy(busy = true, error = null)
            try { action() }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) {
                if (error is HttpException && error.code() == 401) { repository.tokens.clear(); mutable.value = DriverUiState(error = "Session expired. Sign in again.") }
                else mutable.value = mutable.value.copy(error = if (error is HttpException) "Request failed (${error.code()}). Check credentials, assignment, and connection." else "Could not connect. Please try again.")
            } finally { mutable.value = mutable.value.copy(busy = false) }
        }
    }
    fun login(id: String, password: String) = run {
        val assignment = repository.login(id, password)
        mutable.value = DriverUiState(signedIn = true, bus = assignment.bus, active = assignment.trip?.status == "ACTIVE")
    }
    fun refresh() = run {
        val assignment = repository.api.assignment()
        mutable.value = DriverUiState(signedIn = true, bus = assignment.bus, active = assignment.trip?.status == "ACTIVE")
    }
    fun startTrip() = run {
        val bus = mutable.value.bus ?: error("No assigned bus")
        repository.api.start(TripRequest(bus.id))
        mutable.value = mutable.value.copy(active = true)
        resumeTracking()
    }
    fun resumeTracking() {
        val bus = mutable.value.bus ?: return
        try { ContextCompat.startForegroundService(getApplication(), Intent(getApplication(), LocationService::class.java).putExtra("busId", bus.id)) }
        catch (_: Exception) { mutable.value = mutable.value.copy(error = "Trip is active, but GPS could not start. Grant precise location permission and resume tracking.") }
    }
    fun stopTrip() = run {
        val bus = mutable.value.bus ?: error("No assigned bus")
        repository.api.stop(TripRequest(bus.id))
        getApplication<Application>().stopService(Intent(getApplication(), LocationService::class.java))
        TrackingState.update("Not tracking")
        mutable.value = mutable.value.copy(active = false)
    }
    fun logout() {
        if (mutable.value.active) { mutable.value = mutable.value.copy(error = "Stop the trip before signing out."); return }
        repository.tokens.clear(); mutable.value = DriverUiState()
    }
    fun permissionDenied() { mutable.value = mutable.value.copy(error = "Precise location permission is required to track your bus.") }
}