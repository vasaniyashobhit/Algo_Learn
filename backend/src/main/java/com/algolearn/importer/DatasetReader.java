package com.algolearn.importer;

import java.util.List;

/** Reads every row of the dataset file. Failures are a 500 AppException naming the file. */
public interface DatasetReader {

    List<DatasetRow> read(String path);
}
