@file: StorageManager — on-disk ring buffer with clip protection
package com.nexgen.dashcam

import android.content.Context
import java.io.File

/**
 * Manages video segments on disk using a ring buffer strategy.
 * Protected clips are excluded from automatic eviction.
 */
class StorageManager(private val context: Context) {

    private var maxBytes: Long = 8L * 1024 * 1024 * 1024 // 8 GB
    private val protectedPaths = mutableSetOf<String>()

    var currentTripId: String? = null
        private set

    fun configure(maxMb: Int) {
        this.maxBytes = maxMb.toLong() * 1024 * 1024
    }

    fun addSegment(segment: MediaEncoder.EncodedSegment) {
        val dir = File(context.filesDir, "dashcam/trips")
        if (!dir.exists()) dir.mkdirs()

        enforceStorageQuota(dir)
    }

    fun protectSegment(segmentId: String): Boolean {
        protectedPaths.add(segmentId)
        return true
    }

    fun unprotectSegment(segmentId: String): Boolean {
        return protectedPaths.remove(segmentId)
    }

    private fun enforceStorageQuota(tripDir: File) {
        val allFiles = tripDir.walkTopDown()
            .filter { it.isFile && it.extension == "mp4" }
            .toList()

        var currentSize = allFiles.sumOf { it.length() }

        val unprotected = allFiles
            .filter { !protectedPaths.contains(it.absolutePath) }
            .sortedBy { it.lastModified() }

        val iterator = unprotected.iterator()
        while (currentSize > maxBytes && iterator.hasNext()) {
            val file = iterator.next()
            currentSize -= file.length()
            file.delete()
        }
    }
}
