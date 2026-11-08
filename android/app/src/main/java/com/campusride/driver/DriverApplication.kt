package com.campusride.driver

import android.app.Application
import com.campusride.driver.data.DriverRepository
import com.campusride.driver.data.TokenStore

class DriverApplication : Application() {
    lateinit var repository: DriverRepository
        private set
    override fun onCreate() {
        super.onCreate()
        repository = DriverRepository(TokenStore(this))
    }
}